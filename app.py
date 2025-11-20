from flask import Flask, render_template, request, jsonify, send_file
import requests
import json
import base64
import hashlib
import urllib.parse
import sqlite3
import uuid
import qrcode
from PIL import Image
import io
import random
import string
from datetime import datetime, timedelta
import jwt


app = Flask(__name__)
app.config['SECRET_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzI0MjQiLCJuYW1lIjoiVGVzdCBVc2VyIDQxIiwiaWF0IjoxNzYzNjMwODc4LCJleHAiOjE3NjM2MzQ0Nzh9.bXonqB8Csw0WKYH7d1ozBrvvPXQ7Dqnh5WLR7Jw0-4U'

# --- TELEGRAM CONFIGURATION ---
# TOKEN: 8350436316:AAEihQ0h5LssxCtiVjX9vVuBur-PPgvgLXs
# CHAT ID: 6059110157
# CATATAN: ID CHAT PERSONAL (USER) biasanya tidak perlu tanda minus.
#          Jika ini adalah ID Grup/Channel, kemungkinan besar harus negatif (e.g., '-12345').
TELEGRAM_TOKEN = '8350436316:AAEihQ0h5LssxCtiVjX9vVuBur-PPgvgLXs' 
TELEGRAM_CHAT_ID = '6059110157'
# -----------------------------------------------------------


# Database initialization
def init_db():
    conn = sqlite3.connect('shiny_portal.db')
    c = conn.cursor()
    
    # Create requests history table
    c.execute('''CREATE TABLE IF NOT EXISTS request_history
                 (id TEXT PRIMARY KEY,
                  method TEXT,
                  url TEXT,
                  timestamp DATETIME,
                  status_code INTEGER)''')
    
    # Create saved requests table
    c.execute('''CREATE TABLE IF NOT EXISTS saved_requests
                 (id TEXT PRIMARY KEY,
                  name TEXT,
                  method TEXT,
                  url TEXT,
                  headers TEXT,
                  data TEXT,
                  created_at DATETIME)''')
    
    conn.commit()
    conn.close()

init_db()

# --- TELEGRAM SENDER FUNCTION ---

def send_to_telegram(issue_data):
    """Formats issue data and sends it to Telegram."""
    
    # PERBAIKAN: Hapus pengecekan token spesifik, cukup cek keberadaan token dan chat ID.
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        print("ERROR: Telegram token or chat ID is missing.")
        return False, "Configuration missing"

    # Format the message using Markdown for Telegram
    message = f"""
*🚨 NEW ISSUE REPORT (Shiny Portal) 🚨*
*Type:* `{issue_data.get('type', 'N/A').upper()}`
*Title:* _{issue_data.get('title', 'N/A')}_
*Version:* `{issue_data.get('version', '1.0.0')}`
*Time:* `{issue_data.get('timestamp', 'N/A')}`
---
*Description:*
{issue_data.get('description', 'N/A')}
---
*Steps to Reproduce:*
{issue_data.get('steps', 'N/A')}
---
*Environment:*
*Browser:* {issue_data.get('browser', 'N/A')}
*OS:* {issue_data.get('os', 'N/A')}
*Expected:* {issue_data.get('expected-behavior', 'N/A')}
*Actual:* {issue_data.get('actual-behavior', 'N/A')}
"""
    
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    
    payload = {
        'chat_id': TELEGRAM_CHAT_ID,
        'text': message,
        'parse_mode': 'Markdown' 
    }
    
    try:
        response = requests.post(url, data=payload)
        response.raise_for_status() 
        return response.json().get('ok', False), response.text
    except requests.exceptions.RequestException as e:
        # PERBAIKAN: Cetak detail error dari Telegram ke konsol server
        error_detail = e.response.text if e.response is not None else str(e)
        print(f"Telegram API Error: {error_detail}")
        return False, error_detail


# --- ROUTING ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/documentation')
def documentation():
    return render_template('documentation.html')

@app.route('/report_issue')
def report_issue():
    return render_template('report_issue.html')

@app.route('/submit_issue', methods=['POST'])
def submit_issue():
    try:
        issue_data = request.json
        
        # 1. Kirim data ke Telegram
        success, telegram_response = send_to_telegram(issue_data)
        
        if success:
            return jsonify({'success': True, 'message': 'Issue reported successfully and sent to Telegram!'})
        else:
            # Mengembalikan detail error dari Telegram
            print(f"Failed to send to Telegram: {telegram_response}")
            return jsonify({'success': False, 'message': 'Issue received but failed to send to Telegram.', 'detail': telegram_response}), 500
            
    except Exception as e:
        print(f"Server error during issue submission: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# --- HTTP CLIENT API ---

@app.route('/send_request', methods=['POST'])
def send_request():
    try:
        url = request.form.get('url')
        method = request.form.get('method', 'GET').upper()
        headers = request.form.get('headers', '{}')
        data = request.form.get('data', '')
        
        # Parse headers
        try:
            headers_dict = json.loads(headers)
        except:
            headers_dict = {}
        
        # Determine body argument based on Content-Type
        body_args = {}
        if method in ['POST', 'PUT']:
            content_type = headers_dict.get('Content-Type', '').lower()
            if 'application/json' in content_type:
                try:
                    # Attempt to parse as JSON if Content-Type is application/json
                    body_args['json'] = json.loads(data)
                except json.JSONDecodeError:
                    # Fallback to plain data if JSON parsing fails
                    body_args['data'] = data
            else:
                body_args['data'] = data

        # Send request
        start_time = datetime.now()
        response = requests.request(method, url, headers=headers_dict, **body_args, timeout=15)
        end_time = datetime.now()
        
        # Save to history
        save_request_history(method, url, response.status_code)
        
        # Prepare response data
        result = {
            'status_code': response.status_code,
            'headers': dict(response.headers),
            'content': response.text,
            'url': response.url,
            'size': len(response.content),
            'time': round((end_time - start_time).total_seconds(), 3)
        }
        
        return jsonify(result)
        
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timeout (took longer than 15s)'})
    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Connection error (check URL or network)'})
    except Exception as e:
        return jsonify({'error': str(e)})

# --- HISTORY & SAVED REQUESTS DB OPERATIONS ---

def save_request_history(method, url, status_code):
    conn = sqlite3.connect('shiny_portal.db')
    c = conn.cursor()
    c.execute('INSERT INTO request_history VALUES (?, ?, ?, ?, ?)',
              (str(uuid.uuid4()), method, url, datetime.now(), status_code))
    conn.commit()
    conn.close()

@app.route('/save_request', methods=['POST'])
def save_request():
    try:
        data = request.json
        conn = sqlite3.connect('shiny_portal.db')
        c = conn.cursor()
        c.execute('INSERT INTO saved_requests VALUES (?, ?, ?, ?, ?, ?, ?)',
                  (str(uuid.uuid4()), data['name'], data['method'], data['url'],
                   data['headers'], data['data'], datetime.now()))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/get_saved_requests', methods=['GET'])
def get_saved_requests():
    conn = sqlite3.connect('shiny_portal.db')
    c = conn.cursor()
    c.execute('SELECT * FROM saved_requests ORDER BY created_at DESC')
    requests = c.fetchall()
    conn.close()
    
    result = []
    for req in requests:
        result.append({
            'id': req[0],
            'name': req[1],
            'method': req[2],
            'url': req[3],
            'headers': req[4],
            'data': req[5],
            'created_at': req[6]
        })
    
    return jsonify(result)

@app.route('/get_request_history', methods=['GET'])
def get_request_history():
    conn = sqlite3.connect('shiny_portal.db')
    c = conn.cursor()
    c.execute('SELECT * FROM request_history ORDER BY timestamp DESC LIMIT 50')
    history = c.fetchall()
    conn.close()
    
    result = []
    for item in history:
        result.append({
            'id': item[0],
            'method': item[1],
            'url': item[2],
            'timestamp': item[3],
            'status_code': item[4]
        })
    
    return jsonify(result)

# --- ENCODER/DECODER API ---

@app.route('/encode_decode', methods=['POST'])
def encode_decode():
    try:
        text = request.form.get('text', '')
        action = request.form.get('action', '')
        
        if action == 'url_encode':
            result = urllib.parse.quote(text)
        elif action == 'url_decode':
            result = urllib.parse.unquote(text)
        elif action == 'base64_encode':
            result = base64.b64encode(text.encode('utf-8')).decode('utf-8')
        elif action == 'base64_decode':
            try:
                # Base64 strings must have a length divisible by 4. Add padding if necessary.
                missing_padding = len(text) % 4
                if missing_padding:
                    text += '=' * (4 - missing_padding)
                
                result = base64.b64decode(text).decode('utf-8', errors='ignore')
            except Exception:
                result = 'Invalid Base64 string'
        elif action == 'md5_hash':
            result = hashlib.md5(text.encode('utf-8')).hexdigest()
        elif action == 'sha1_hash':
            result = hashlib.sha1(text.encode('utf-8')).hexdigest()
        elif action == 'sha256_hash':
            result = hashlib.sha256(text.encode('utf-8')).hexdigest()
        elif action == 'sha512_hash':
            result = hashlib.sha512(text.encode('utf-8')).hexdigest()
        elif action == 'html_encode':
            # Basic HTML entity encoding
            result = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&#39;')
        elif action == 'html_decode':
            # Basic HTML entity decoding
            result = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
        else:
            return jsonify({'error': 'Action not supported'})
            
        return jsonify({'result': result})
        
    except Exception as e:
        return jsonify({'error': str(e)})

# --- DATA GENERATOR API ---

@app.route('/generate_data', methods=['POST'])
def generate_data():
    try:
        data = request.json
        data_type = data.get('type')
        length = int(data.get('length', 12))
        
        if length < 1:
            return jsonify({'error': 'Length must be a positive number'})
        
        if data_type == 'password':
            characters = string.ascii_letters + string.digits + '!@#$%^&*'
            result = ''.join(random.choice(characters) for _ in range(length))
        elif data_type == 'api_key':
            result = str(uuid.uuid4()).replace('-', '') + str(uuid.uuid4()).replace('-', '')[:length-32]
            if length > 32:
                 result = result[:length]
            elif length < 32:
                 result = str(uuid.uuid4()).replace('-', '')[:length]
        elif data_type == 'jwt_token':
            # Generate a simple payload
            payload = {
                'sub': 'user_' + str(random.randint(1000, 9999)),
                'name': 'Test User ' + str(random.randint(1, 100)),
                'iat': datetime.utcnow(),
                'exp': datetime.utcnow() + timedelta(hours=1) # Expires in 1 hour
            }
            # Use the configured SECRET_KEY for signing
            result = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
        elif data_type == 'random_number':
            result = random.randint(1, 10**length)
        elif data_type == 'lorem_ipsum':
            lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
            words = lorem.split()
            result = ' '.join(random.choices(words, k=length))
        else:
            return jsonify({'error': 'Type not supported'})
            
        return jsonify({'result': str(result)})
        
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/generate_qr', methods=['POST'])
def generate_qr():
    try:
        data = request.form.get('data', '')
        if not data:
            return jsonify({'error': 'No data provided'})
        
        # Using the qrcode library
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H, # High correction
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        # Create an image instance from the QR code data
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save image to an in-memory buffer
        img_io = io.BytesIO()
        img.save(img_io, 'PNG')
        img_io.seek(0)
        
        return send_file(img_io, mimetype='image/png')
        
    except Exception as e:
        return jsonify({'error': str(e)})

# --- JSON ANALYZER API ---

@app.route('/analyze_json', methods=['POST'])
def analyze_json():
    try:
        json_text = request.form.get('json_text', '')
        if not json_text:
            return jsonify({'error': 'No JSON provided'})
        
        # Attempt to parse the JSON input
        data = json.loads(json_text)
        
        def analyze_structure(obj, path=''):
            analysis = []
            
            # Handle dictionary
            if isinstance(obj, dict):
                for key, value in obj.items():
                    current_path = f"{path}.{key}" if path else key
                    value_type = type(value).__name__
                    value_str = str(value)
                    
                    if isinstance(value, (dict, list)):
                        # Shorten the display for nested structures
                        display_value = f"[{'Object' if isinstance(value, dict) else 'Array'}]"
                    else:
                        # Truncate long strings for readability
                        display_value = value_str[:100] + '...' if len(value_str) > 100 else value_str
                        
                    analysis.append({
                        'path': current_path,
                        'type': value_type,
                        'value': display_value
                    })
                    
                    if isinstance(value, (dict, list)):
                        analysis.extend(analyze_structure(value, current_path))
            
            # Handle list/array
            elif isinstance(obj, list):
                for i, value in enumerate(obj):
                    current_path = f"{path}[{i}]"
                    value_type = type(value).__name__
                    value_str = str(value)

                    if isinstance(value, (dict, list)):
                        display_value = f"[{'Object' if isinstance(value, dict) else 'Array'}]"
                    else:
                        display_value = value_str[:100] + '...' if len(value_str) > 100 else value_str

                    # Only add the item if it's a basic type or a container itself
                    if not isinstance(value, (dict, list)) or not path: 
                         analysis.append({
                            'path': current_path,
                            'type': value_type,
                            'value': display_value
                        })

                    if isinstance(value, (dict, list)):
                        analysis.extend(analyze_structure(value, current_path))
                        
            return analysis
        
        analysis = analyze_structure(data)
        
        return jsonify({
            'valid': True,
            'size': len(json_text.encode('utf-8')), # Get size in bytes
            'analysis': analysis
        })
        
    except json.JSONDecodeError as e:
        return jsonify({'error': f'Invalid JSON: {str(e)}'})
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
