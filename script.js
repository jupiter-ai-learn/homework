// Restaurant Recommendation App JavaScript
class RestaurantApp {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 6;
        this.currentResults = [];
        this.currentQuery = '';
        this.apiKeys = {
            kakao: localStorage.getItem('kakaoApiKey') || '',
            openai: localStorage.getItem('openaiApiKey') || ''
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateApiStatus();
        this.showEmptyState();
    }

    bindEvents() {
        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        
        searchBtn.addEventListener('click', () => this.handleSearch());
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // Suggestion tags
        const suggestionTags = document.querySelectorAll('.suggestion-tag');
        suggestionTags.forEach(tag => {
            tag.addEventListener('click', () => {
                const query = tag.getAttribute('data-query');
                searchInput.value = query;
                this.handleSearch();
            });
        });

        // Settings modal functionality
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const settingsClose = document.getElementById('settingsClose');
        const saveApiKeys = document.getElementById('saveApiKeys');
        const clearApiKeys = document.getElementById('clearApiKeys');
        
        settingsBtn.addEventListener('click', () => {
            this.showSettingsModal();
        });
        
        settingsClose.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
        
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
        
        saveApiKeys.addEventListener('click', () => {
            this.saveApiKeys();
        });
        
        clearApiKeys.addEventListener('click', () => {
            this.clearApiKeys();
        });

        // Restaurant modal functionality
        const modal = document.getElementById('restaurantModal');
        const modalClose = document.getElementById('modalClose');
        
        modalClose.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Pagination
        document.getElementById('prevBtn').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.displayResults();
            }
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            const totalPages = Math.ceil(this.currentResults.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.displayResults();
            }
        });
    }

    async handleSearch() {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput.value.trim();
        
        if (!query) {
            this.showError('검색어를 입력해주세요.');
            return;
        }

        // Check if API keys are configured
        if (!this.apiKeys.kakao || !this.apiKeys.openai) {
            this.showError('API 키를 먼저 설정해주세요. 우측 상단의 "API 설정" 버튼을 클릭하세요.');
            return;
        }

        this.currentQuery = query;
        this.showLoading(true);
        this.hideError();
        this.hideEmptyState();

        try {
            // 1) OpenAI로 장소/키워드 추출
            const { location, keyword } = await this.extractLocationAndKeyword(query);

            // 2) Kakao Local 검색
            const restaurants = await this.searchKakaoPlaces(`${location} ${keyword}`.trim());
            this.currentResults = Array.isArray(restaurants) ? restaurants : [];
            this.currentPage = 1;

            // 3) OpenAI로 AI 추천 생성
            const recommendation = await this.generateAIRecommendation(query, this.currentResults);

            this.displayAIRecommendation(recommendation);
            this.displayResults();
            
        } catch (error) {
            console.error('Search error:', error);
            let errorMessage = '검색 중 오류가 발생했습니다.';
            
            if (error.message.includes('400')) {
                errorMessage = 'API 키가 올바르지 않습니다. 설정을 확인해주세요.';
            } else if (error.message.includes('401')) {
                errorMessage = 'API 키 인증에 실패했습니다. API 키를 다시 확인해주세요.';
            } else if (error.message.includes('429')) {
                errorMessage = 'API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
            } else if (error.message.includes('CORS')) {
                errorMessage = '브라우저 CORS 정책으로 요청이 차단되었습니다. 파일을 로컬 서버로 열어주세요.';
            }
            
            this.showError(errorMessage);
            this.showEmptyState();
        } finally {
            this.showLoading(false);
        }
    }

    async extractLocationAndKeyword(query) {
        const url = 'https://api.openai.com/v1/chat/completions';
        const model = 'gpt-4o-mini';
        const body = {
            model,
            messages: [
                {
                    role: 'system',
                    content: '다음 질문에서 지명 하나와 가장 중요한 키워드 하나를 추출해서 하나로 붙여줘.\n원하는 형식:\n<place>:<keyword>'
                },
                { role: 'user', content: query }
            ],
            temperature: 0,
            max_tokens: 128,
            top_p: 1
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKeys.openai}`
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            throw new Error(`OpenAI 요청 실패 (${res.status})`);
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content?.trim() || '';
        const parts = content.split(':');
        if (parts.length === 2) {
            return { location: parts[0].trim(), keyword: parts[1].trim() };
        }
        // Fallback
        const tokens = query.split(/\s+/);
        return { location: tokens[0] || query, keyword: tokens.slice(1).join(' ') || '맛집' };
    }

    async searchKakaoPlaces(searchQuery) {
        const endpoint = 'https://dapi.kakao.com/v2/local/search/keyword.json';
        const url = `${endpoint}?query=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(url, {
            headers: {
                'Authorization': `KakaoAK ${this.apiKeys.kakao}`
            }
        });
        if (!res.ok) {
            throw new Error(`Kakao Local 요청 실패 (${res.status})`);
        }
        const data = await res.json();
        return data?.documents || [];
    }

    async generateAIRecommendation(originalQuery, restaurants) {
        if (!restaurants || restaurants.length === 0) {
            return '검색 결과가 없어서 추천을 생성할 수 없습니다.';
        }

        const context = restaurants.slice(0, 10).map((place, i) => {
            const phone = place.phone ? `, ${place.phone}` : '';
            return `${i + 1}) ${place.place_name}, ${place.address_name}, ${place.category_name}${phone}`;
        }).join('\n');

        const url = 'https://api.openai.com/v1/chat/completions';
        const model = 'gpt-4o-mini';
        const body = {
            model,
            messages: [
                {
                    role: 'system',
                    content: `주어진 문단을 보고 다음 질문에 답해줘: ${originalQuery}\n\n답변은 친근하고 도움이 되는 톤으로 작성하고, 구체적인 추천 이유를 포함해줘. 답변은 500자 이내로 작성해줘.`
                },
                {
                    role: 'user',
                    content: context
                }
            ],
            temperature: 0.7,
            max_tokens: 512,
            top_p: 1
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKeys.openai}`
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            console.error('OpenAI 응답 오류:', await res.text());
            return 'AI 추천을 생성하는 중 오류가 발생했습니다.';
        }
        const data = await res.json();
        return data?.choices?.[0]?.message?.content || 'AI 추천을 생성할 수 없습니다.';
    }

    displayAIRecommendation(recommendation) {
        const aiSection = document.getElementById('aiRecommendation');
        const recommendationContent = document.getElementById('recommendationContent');
        
        if (recommendation) {
            recommendationContent.innerHTML = this.formatRecommendation(recommendation);
            aiSection.style.display = 'block';
        } else {
            aiSection.style.display = 'none';
        }
    }

    formatRecommendation(text) {
        // Format the AI recommendation text with better styling
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/(\d+\.\s)/g, '<br><strong>$1</strong>');
    }

    displayResults() {
        const resultsSection = document.getElementById('resultsSection');
        const restaurantsGrid = document.getElementById('restaurantsGrid');
        
        if (this.currentResults.length === 0) {
            resultsSection.style.display = 'none';
            this.showError('검색 결과가 없습니다. 다른 검색어를 시도해보세요.');
            return;
        }

        resultsSection.style.display = 'block';
        
        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageResults = this.currentResults.slice(startIndex, endIndex);
        
        // Display restaurants
        restaurantsGrid.innerHTML = pageResults.map(restaurant => 
            this.createRestaurantCard(restaurant)
        ).join('');

        // Add click events to restaurant cards
        const cards = restaurantsGrid.querySelectorAll('.restaurant-card');
        cards.forEach((card, index) => {
            card.addEventListener('click', () => {
                this.showRestaurantModal(pageResults[index]);
            });
        });

        // Update pagination
        this.updatePagination();
    }

    createRestaurantCard(restaurant) {
        const categoryParts = restaurant.category_name.split(' > ');
        const mainCategory = categoryParts[categoryParts.length - 1] || '음식점';
        
        return `
            <div class="restaurant-card" data-id="${restaurant.id}">
                <div class="restaurant-header">
                    <div class="restaurant-name">
                        <i class="fas fa-utensils"></i>
                        ${restaurant.place_name}
                    </div>
                    <div class="restaurant-category">${mainCategory}</div>
                </div>
                <div class="restaurant-info">
                    <div class="info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${restaurant.road_address_name || restaurant.address_name}</span>
                    </div>
                    ${restaurant.phone ? `
                        <div class="info-item">
                            <i class="fas fa-phone"></i>
                            <span>${restaurant.phone}</span>
                        </div>
                    ` : ''}
                    <div class="info-item">
                        <i class="fas fa-tags"></i>
                        <span>${restaurant.category_name}</span>
                    </div>
                </div>
            </div>
        `;
    }

    showRestaurantModal(restaurant) {
        const modal = document.getElementById('restaurantModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        modalTitle.textContent = restaurant.place_name;
        modalBody.innerHTML = `
            <div class="modal-restaurant-info">
                <div class="info-section">
                    <h4><i class="fas fa-info-circle"></i> 기본 정보</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>카테고리:</strong>
                            <span>${restaurant.category_name}</span>
                        </div>
                        ${restaurant.phone ? `
                            <div class="info-item">
                                <strong>전화번호:</strong>
                                <span>${restaurant.phone}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="info-section">
                    <h4><i class="fas fa-map-marker-alt"></i> 위치 정보</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>도로명 주소:</strong>
                            <span>${restaurant.road_address_name || '정보 없음'}</span>
                        </div>
                        <div class="info-item">
                            <strong>지번 주소:</strong>
                            <span>${restaurant.address_name}</span>
                        </div>
                    </div>
                </div>
                
                <div class="info-section">
                    <h4><i class="fas fa-external-link-alt"></i> 추가 정보</h4>
                    <div class="modal-actions">
                        <a href="${restaurant.place_url}" target="_blank" class="modal-btn">
                            <i class="fas fa-map"></i>
                            카카오맵에서 보기
                        </a>
                        ${restaurant.phone ? `
                            <a href="tel:${restaurant.phone}" class="modal-btn">
                                <i class="fas fa-phone"></i>
                                전화걸기
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    updatePagination() {
        const totalPages = Math.ceil(this.currentResults.length / this.itemsPerPage);
        const pagination = document.getElementById('pagination');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const pageNumbers = document.getElementById('pageNumbers');
        
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }
        
        pagination.style.display = 'flex';
        
        // Update prev/next buttons
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages;
        
        // Update page numbers
        pageNumbers.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                this.currentPage = i;
                this.displayResults();
            });
            pageNumbers.appendChild(pageBtn);
        }
    }

    showLoading(show) {
        const searchBtn = document.getElementById('searchBtn');
        if (show) {
            searchBtn.classList.add('loading');
            searchBtn.disabled = true;
        } else {
            searchBtn.classList.remove('loading');
            searchBtn.disabled = false;
        }
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    hideError() {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.style.display = 'none';
    }

    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const resultsSection = document.getElementById('resultsSection');
        emptyState.style.display = 'block';
        resultsSection.style.display = 'none';
    }

    hideEmptyState() {
        const emptyState = document.getElementById('emptyState');
        emptyState.style.display = 'none';
    }

    showSettingsModal() {
        const settingsModal = document.getElementById('settingsModal');
        const kakaoInput = document.getElementById('kakaoApiKey');
        const openaiInput = document.getElementById('openaiApiKey');
        
        // Load current API keys into the form
        kakaoInput.value = this.apiKeys.kakao;
        openaiInput.value = this.apiKeys.openai;
        
        settingsModal.style.display = 'block';
    }

    saveApiKeys() {
        const kakaoInput = document.getElementById('kakaoApiKey');
        const openaiInput = document.getElementById('openaiApiKey');
        
        const kakaoKey = kakaoInput.value.trim();
        const openaiKey = openaiInput.value.trim();
        
        if (!kakaoKey || !openaiKey) {
            alert('모든 API 키를 입력해주세요.');
            return;
        }
        
        // Save to localStorage
        localStorage.setItem('kakaoApiKey', kakaoKey);
        localStorage.setItem('openaiApiKey', openaiKey);
        
        // Update internal state
        this.apiKeys.kakao = kakaoKey;
        this.apiKeys.openai = openaiKey;
        
        // Update status display
        this.updateApiStatus();
        
        // Close modal
        document.getElementById('settingsModal').style.display = 'none';
        
        // Show success message
        this.showError('API 키가 성공적으로 저장되었습니다!');
        setTimeout(() => {
            this.hideError();
        }, 3000);
    }

    clearApiKeys() {
        if (confirm('저장된 API 키를 모두 삭제하시겠습니까?')) {
            // Clear from localStorage
            localStorage.removeItem('kakaoApiKey');
            localStorage.removeItem('openaiApiKey');
            
            // Clear internal state
            this.apiKeys.kakao = '';
            this.apiKeys.openai = '';
            
            // Clear form inputs
            document.getElementById('kakaoApiKey').value = '';
            document.getElementById('openaiApiKey').value = '';
            
            // Update status display
            this.updateApiStatus();
            
            // Show success message
            this.showError('API 키가 삭제되었습니다.');
            setTimeout(() => {
                this.hideError();
            }, 3000);
        }
    }

    updateApiStatus() {
        const kakaoStatus = document.getElementById('kakaoStatus');
        const openaiStatus = document.getElementById('openaiStatus');
        
        if (this.apiKeys.kakao) {
            kakaoStatus.textContent = '설정됨';
            kakaoStatus.className = 'status-value configured';
        } else {
            kakaoStatus.textContent = '미설정';
            kakaoStatus.className = 'status-value not-configured';
        }
        
        if (this.apiKeys.openai) {
            openaiStatus.textContent = '설정됨';
            openaiStatus.className = 'status-value configured';
        } else {
            openaiStatus.textContent = '미설정';
            openaiStatus.className = 'status-value not-configured';
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RestaurantApp();
});

// Add some CSS for modal content
const modalStyles = `
<style>
.modal-restaurant-info .info-section {
    margin-bottom: 25px;
}

.modal-restaurant-info .info-section:last-child {
    margin-bottom: 0;
}

.modal-restaurant-info h4 {
    color: #333;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.1rem;
}

.modal-restaurant-info h4 i {
    color: #667eea;
}

.info-grid .info-item {
    display: flex;
    margin-bottom: 10px;
    line-height: 1.5;
}

.info-grid .info-item strong {
    min-width: 100px;
    color: #555;
}

.info-grid .info-item span {
    color: #333;
    flex: 1;
}

.modal-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.modal-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #667eea;
    color: white;
    text-decoration: none;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 0.9rem;
    transition: all 0.3s ease;
}

.modal-btn:hover {
    background: #5a67d8;
    transform: translateY(-2px);
}

.modal-btn i {
    font-size: 0.9rem;
}
</style>
`;

// Inject modal styles
document.head.insertAdjacentHTML('beforeend', modalStyles);
