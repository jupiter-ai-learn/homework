# 🍽️ 맛집 추천 서비스

AI 기반 맛집 추천 웹 애플리케이션입니다. Kakao Local API를 통해 실시간 맛집 정보를 검색하고, OpenAI GPT를 활용하여 개인화된 맛집 추천을 제공합니다.

## ✨ 주요 기능

- 🔍 **지역별 맛집 검색**: 지역과 음식 종류를 입력하여 맛집 검색
- 🤖 **AI 기반 추천**: GPT를 활용한 개인화된 맛집 추천
- 📱 **반응형 디자인**: 모바일, 태블릿, 데스크톱 모든 기기에서 최적화
- 🗺️ **상세 정보 제공**: 주소, 전화번호, 카테고리 등 상세 정보
- 🔗 **카카오맵 연동**: 카카오맵에서 위치 확인 가능
- 🔑 **웹 기반 API 키 설정**: 브라우저에서 직접 API 키 입력 및 관리

## 🛠️ 기술 스택

### Frontend
- **HTML5**: 시맨틱 마크업
- **CSS3**: 모던 스타일링, Flexbox, Grid, 애니메이션
- **JavaScript (ES6+)**: 순수 자바스크립트, 비동기 처리

### Backend
- **Python 3.10+**: 백엔드 언어
- **Flask**: 웹 프레임워크
- **Flask-CORS**: CORS 처리

### APIs
- **Kakao Local API**: 맛집 검색
- **OpenAI GPT API**: AI 추천 생성

## 📦 설치 및 실행

### 1. 저장소 클론
```bash
git clone <repository-url>
cd homework
```

### 2. 가상환경 생성 및 활성화
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows
```

### 3. 패키지 설치
```bash
pip install -r requirements.txt
```

### 4. 애플리케이션 실행
```bash
python app.py
```

브라우저에서 `http://localhost:5000`으로 접속하여 서비스를 이용할 수 있습니다.

## 🔑 API 키 설정

애플리케이션을 사용하기 전에 필요한 API 키를 설정해야 합니다:

### 1. Kakao Local API 키 발급
1. [Kakao Developers](https://developers.kakao.com/)에 접속
2. 애플리케이션 생성 후 REST API 키 확인
3. 플랫폼 설정에서 웹 플랫폼 추가 (`http://localhost:5000`)

### 2. OpenAI API 키 발급
1. [OpenAI Platform](https://platform.openai.com/api-keys)에 접속
2. API 키 생성
3. 사용량 제한 및 결제 방법 설정

### 3. 웹에서 API 키 입력
1. 애플리케이션 실행 후 우측 상단의 "API 설정" 버튼 클릭
2. Kakao API 키와 OpenAI API 키 입력
3. "저장" 버튼 클릭

## 🎯 사용 방법

1. **API 키 설정**: 처음 사용 시 API 키를 설정합니다.
2. **검색어 입력**: "강남역 이탈리안", "홍대 카페" 등의 형태로 검색어를 입력합니다.
3. **AI 추천 확인**: GPT가 생성한 맞춤형 추천을 확인합니다.
4. **맛집 정보 탐색**: 검색 결과에서 원하는 맛집을 클릭하여 상세 정보를 확인합니다.
5. **카카오맵 연동**: 맛집 상세 정보에서 "카카오맵에서 보기" 버튼을 클릭합니다.

## 📁 프로젝트 구조

```
homework/
├── app.py              # Flask 백엔드 서버
├── index.html          # 메인 HTML 페이지
├── styles.css          # CSS 스타일시트
├── script.js           # JavaScript 로직
├── requirements.txt    # Python 패키지 목록
├── .env.example       # 환경변수 예시 파일
└── README.md          # 프로젝트 문서
```

## 🔧 주요 컴포넌트

### Backend (app.py)
- `/api/search`: 맛집 검색 및 AI 추천 API
- `/health`: 서버 상태 확인 API
- Kakao Local API 연동
- OpenAI GPT API 연동

### Frontend
- **RestaurantApp 클래스**: 메인 애플리케이션 로직
- **API 키 관리**: localStorage를 통한 브라우저 저장
- **반응형 UI**: 모든 기기에서 최적화된 사용자 경험
- **모달 시스템**: 설정 및 상세 정보 표시

## 🎨 UI/UX 특징

- **모던 디자인**: 그라디언트 배경과 카드 기반 레이아웃
- **직관적 인터페이스**: 명확한 버튼과 아이콘 사용
- **부드러운 애니메이션**: hover 효과와 전환 애니메이션
- **접근성 고려**: 키보드 네비게이션 및 시맨틱 마크업
- **로딩 상태**: 검색 중 로딩 스피너 표시

## 🔒 보안 고려사항

- API 키는 브라우저의 localStorage에 저장
- 백엔드에서 API 키 유효성 검증
- CORS 설정으로 허용된 도메인에서만 접근 가능
- 민감한 정보는 서버에 저장하지 않음

## 🚀 배포 가이드

### Heroku 배포
```bash
# Procfile 생성
echo "web: gunicorn app:app" > Procfile

# Heroku 앱 생성 및 배포
heroku create your-app-name
git push heroku main
```

### Docker 배포
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
```

## 🐛 문제 해결

### 일반적인 문제들

1. **API 키 오류**
   - API 키가 올바르게 입력되었는지 확인
   - Kakao Developers에서 플랫폼 설정 확인
   - OpenAI API 사용량 한도 확인

2. **검색 결과 없음**
   - 검색어를 다른 형태로 시도
   - 지역명과 키워드를 명확히 입력

3. **서버 오류**
   - 콘솔에서 에러 로그 확인
   - 필요한 패키지가 모두 설치되었는지 확인

## 📝 라이센스

이 프로젝트는 교육 목적으로 제작되었습니다.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 연락처

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.

---

**⚡ 빠른 시작**: `python app.py` 실행 후 브라우저에서 `http://localhost:5000` 접속!
homework
