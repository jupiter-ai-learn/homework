from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import openai
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Configuration
OPENAI_MODEL = os.getenv("OPENAI_DEFAULT_MODEL", "gpt-4o-mini")

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('.', 'index.html')

@app.route('/api/search', methods=['POST'])
def search_restaurants():
    """Search for restaurants using Kakao Local API and get GPT recommendations"""
    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        kakao_api_key = data.get('kakaoApiKey', '').strip()
        openai_api_key = data.get('openaiApiKey', '').strip()
        
        if not query:
            return jsonify({'error': '검색어를 입력해주세요.'}), 400
        
        # Check if API keys are provided
        if not kakao_api_key:
            return jsonify({'error': 'Kakao API 키를 입력해주세요.'}), 400
        
        if not openai_api_key:
            return jsonify({'error': 'OpenAI API 키를 입력해주세요.'}), 400
        
        # Step 1: Extract location and keyword using GPT
        location_keyword = extract_location_keyword(query, openai_api_key)
        if not location_keyword:
            # Fallback: use the original query directly
            print(f"GPT extraction failed, using original query: {query}")
            location = query.split()[0] if query.split() else query
            keyword = ' '.join(query.split()[1:]) if len(query.split()) > 1 else '맛집'
        else:
            location, keyword = location_keyword
        
        # Step 2: Search restaurants using Kakao Local API
        restaurants = search_kakao_places(f"{location} {keyword}", kakao_api_key)
        if restaurants is None:
            return jsonify({'error': 'Kakao Local API 호출에 실패했습니다.'}), 500
        
        # Step 3: Generate AI recommendation using GPT
        recommendation = generate_ai_recommendation(query, restaurants, openai_api_key)
        if not recommendation:
            recommendation = "AI 추천을 생성할 수 없습니다."
        
        return jsonify({
            'restaurants': restaurants,
            'recommendation': recommendation,
            'query': query,
            'location': location,
            'keyword': keyword
        })
        
    except Exception as e:
        print(f"Error in search_restaurants: {str(e)}")
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

def extract_location_keyword(query, openai_api_key):
    """Extract location and keyword from user query using GPT"""
    try:
        client = openai.OpenAI(api_key=openai_api_key)
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": """다음 질문에서 지명 하나와 가장 중요한 키워드 하나를 추출해서 하나로 붙여줘.
원하는 형식:
<place>:<keyword>"""
                },
                {
                    "role": "user",
                    "content": query
                }
            ],
            temperature=0,
            max_tokens=1024,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )
        
        result = response.choices[0].message.content.strip()
        parts = result.split(":")
        
        if len(parts) == 2:
            return parts[0].strip(), parts[1].strip()
        else:
            return None
            
    except Exception as e:
        print(f"Error in extract_location_keyword: {str(e)}")
        return None

def search_kakao_places(search_query, kakao_api_key):
    """Search places using Kakao Local API"""
    try:
        import urllib.parse
        encoded_query = urllib.parse.quote(search_query)
        url = f'https://dapi.kakao.com/v2/local/search/keyword.json?query={encoded_query}'
        headers = {
            "Authorization": f"KakaoAK {kakao_api_key}"
        }
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        return data.get('documents', [])
        
    except requests.exceptions.RequestException as e:
        print(f"Request error in search_kakao_places: {str(e)}")
        return None
    except Exception as e:
        print(f"Error in search_kakao_places: {str(e)}")
        return None

def generate_ai_recommendation(original_query, restaurants, openai_api_key):
    """Generate AI recommendation based on search results"""
    try:
        if not restaurants:
            return "검색 결과가 없어서 추천을 생성할 수 없습니다."
        
        # Create context from restaurant data
        context = ''
        for i, place in enumerate(restaurants[:10], 1):  # Limit to first 10 results
            context += f"{i}) {place['place_name']}, {place['address_name']}, {place['category_name']}"
            if place.get('phone'):
                context += f", {place['phone']}"
            context += "\n"
        
        client = openai.OpenAI(api_key=openai_api_key)
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": f"주어진 문단을 보고 다음 질문에 답해줘: {original_query}\n\n답변은 친근하고 도움이 되는 톤으로 작성하고, 구체적인 추천 이유를 포함해줘. 답변은 500자 이내로 작성해줘."
                },
                {
                    "role": "user",
                    "content": context
                }
            ],
            temperature=0.7,
            max_tokens=512,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"Error in generate_ai_recommendation: {str(e)}")
        return "AI 추천을 생성하는 중 오류가 발생했습니다."

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': '맛집 추천 서비스가 정상 작동 중입니다.'})

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': '페이지를 찾을 수 없습니다.'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': '서버 내부 오류가 발생했습니다.'}), 500

if __name__ == '__main__':
    print("🍽️  맛집 추천 서비스 시작!")
    print("📍 http://localhost:5000 에서 서비스를 확인할 수 있습니다.")
    print("💡 API 키는 웹 인터페이스에서 입력하세요.")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
