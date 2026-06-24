import os
import xml.etree.ElementTree as ET
import urllib.request
import datetime
import re
import html
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# In-memory cache for Moneycontrol news feeds
_mc_cache = {
    'data': None,
    'last_fetched': None
}

MC_FEED_URL = "https://www.moneycontrol.com/rss/MCtopnews.xml"

def fetch_and_parse_feed():
    try:
        # User-Agent header to prevent being blocked by DDoS protection/WAF
        req = urllib.request.Request(
            MC_FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        
        items = []
        for item in root.findall('.//item'):
            title_el = item.find('title')
            title = title_el.text if title_el is not None else 'No Headline'
            
            link_el = item.find('link')
            link = link_el.text if link_el is not None else ''
            
            desc_el = item.find('description')
            raw_desc = desc_el.text if desc_el is not None else ''
            
            pub_date_el = item.find('pubDate')
            pub_date = pub_date_el.text if pub_date_el is not None else ''
            
            guid_el = item.find('guid')
            guid = guid_el.text if guid_el is not None else link
            
            # Extract image URL and clean text from raw description HTML
            image_url = None
            clean_desc = raw_desc
            
            if raw_desc:
                # Moneycontrol places an <img> tag in their descriptions
                img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', raw_desc)
                if img_match:
                    image_url = img_match.group(1)
                
                # Remove all HTML markup
                clean_desc = re.sub(r'<[^>]+>', '', raw_desc).strip()
                # Unescape HTML entities
                clean_desc = html.unescape(clean_desc)
            
            items.append({
                'title': title.strip(),
                'link': link.strip(),
                'description': clean_desc,
                'image_url': image_url,
                'pub_date': pub_date.strip(),
                'guid': guid.strip()
            })
            
        return items, None
    except Exception as e:
        return None, str(e)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/feeds")
def get_feeds():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    global _mc_cache
    now = datetime.datetime.now()
    
    # 5 minutes caching duration (300 seconds)
    cache_duration = 300
    should_refresh = (
        force_refresh or 
        _mc_cache['data'] is None or 
        _mc_cache['last_fetched'] is None or 
        (now - _mc_cache['last_fetched']).total_seconds() > cache_duration
    )
    
    if should_refresh:
        data, error = fetch_and_parse_feed()
        if error:
            # Serve cached version on network/parsing failure as secondary backup
            if _mc_cache['data'] is not None:
                return jsonify({
                    'feeds': _mc_cache['data'],
                    'last_fetched': _mc_cache['last_fetched'].isoformat(),
                    'warning': f"Failed to refresh feed: {error}. Showing cached version."
                })
            return jsonify({'error': f"Failed to load feeds: {error}"}), 500
        
        _mc_cache['data'] = data
        _mc_cache['last_fetched'] = now
        
    return jsonify({
        'feeds': _mc_cache['data'],
        'last_fetched': _mc_cache['last_fetched'].isoformat()
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
