import os
import xml.etree.ElementTree as ET
import urllib.request
import datetime
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# In-memory cache for the parsed release notes
_cache = {
    'data': None,
    'last_fetched': None
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        # Use a real user-agent to avoid potential blockers
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', namespaces):
            title_el = entry.find('atom:title', namespaces)
            title = title_el.text if title_el is not None else 'No Title'
            
            updated_el = entry.find('atom:updated', namespaces)
            updated = updated_el.text if updated_el is not None else ''
            
            link_el = entry.find("atom:link[@rel='alternate']", namespaces)
            if link_el is None:
                link_el = entry.find("atom:link", namespaces)
            link = link_el.attrib.get('href') if link_el is not None else ''
            
            content_el = entry.find('atom:content', namespaces)
            content = content_el.text if content_el is not None else ''
            
            entries.append({
                'title': title,
                'updated': updated,
                'link': link,
                'content': content
            })
            
        return entries, None
    except Exception as e:
        return None, str(e)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    global _cache
    now = datetime.datetime.now()
    
    # Refresh cache if requested, if there's no data, or if cache is older than 5 minutes (300 seconds)
    cache_duration = 300
    should_refresh = (
        force_refresh or 
        _cache['data'] is None or 
        _cache['last_fetched'] is None or 
        (now - _cache['last_fetched']).total_seconds() > cache_duration
    )
    
    if should_refresh:
        data, error = fetch_and_parse_feed()
        if error:
            # If we have cached data, return it with a warning instead of failing completely
            if _cache['data'] is not None:
                return jsonify({
                    'releases': _cache['data'],
                    'last_fetched': _cache['last_fetched'].isoformat(),
                    'warning': f"Could not fetch fresh feed: {error}. Showing cached data."
                })
            return jsonify({'error': f"Failed to fetch release notes: {error}"}), 500
        
        _cache['data'] = data
        _cache['last_fetched'] = now
        
    return jsonify({
        'releases': _cache['data'],
        'last_fetched': _cache['last_fetched'].isoformat()
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
