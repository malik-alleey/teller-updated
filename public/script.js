document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const learningForm = document.getElementById('learningForm');
    const masailForm = document.getElementById('masailForm');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsDiv = document.getElementById('results');
    const masailResultsDiv = document.getElementById('masailResults');
    const filterCategorySelect = document.getElementById('filterCategory');
    const homeResultsDiv = document.getElementById('homeResultsContent');
    const homeResultsCard = document.getElementById('homeResults');
    const suggestionsDiv = document.getElementById('suggestions');
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    const pageButtons = document.querySelectorAll('button[data-page]');
    const navbarBrand = document.querySelector('.navbar-brand');
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const questionForm = document.getElementById('questionForm');
    const questionInput = document.getElementById('questionInput');
    const questionsListDiv = document.getElementById('questionsList');
    let itemToDelete = null;
    let deleteCallback = null;
    let debounceTimer;

    // Initialize
    loadLearnings();
    
    // Initially hide the home results card
    homeResultsCard.style.display = 'none';

    // Handle navbar brand click
    navbarBrand.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToPage('home');
    });

    // Handle delete confirmation
    confirmDeleteBtn.addEventListener('click', async () => {
        if (itemToDelete && deleteCallback) {
            try {
                await deleteCallback();
                deleteModal.hide();
            } catch (error) {
                // Don't hide the modal on error
                console.error('Delete failed:', error);
            }
        }
    });

    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Skip navigation for dropdown toggles
            if (!link.classList.contains('dropdown-toggle')) {
                navigateToPage(link.dataset.page);
            }
        });
    });
    
    // Add click handlers for dropdown items
    document.querySelectorAll('.dropdown-item.nav-link').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToPage(item.dataset.page);
            // Close the dropdown
            const dropdownMenu = item.closest('.dropdown-menu');
            if (dropdownMenu) {
                const dropdown = bootstrap.Dropdown.getInstance(dropdownMenu.previousElementSibling);
                if (dropdown) {
                    dropdown.hide();
                }
            }
        });
    });
    
    // Page navigation buttons
    pageButtons.forEach(button => {
        button.addEventListener('click', () => {
            navigateToPage(button.dataset.page);
        });
    });
    
    // Navigation function
    function navigateToPage(targetPage) {
        // Update active states in navbar
        navLinks.forEach(nav => nav.classList.remove('active'));
        const targetNav = document.querySelector(`.nav-link[data-page="${targetPage}"]`);
        if (targetNav) targetNav.classList.add('active');
        
        // Show target page
        pages.forEach(page => {
            page.classList.remove('active');
            if (page.id === `${targetPage}-page`) {
                page.classList.add('active');
            }
        });

        // Load data based on page
        if (targetPage === 'show-learning') {
            loadLearnings();
        } else if (targetPage === 'show-masail') {
            loadMasail();
        } else if (targetPage === 'questions') {
            loadQuestions();
        }
        
        // If navigating to home, clear search results if the search box is empty
        if (targetPage === 'home' && searchInput.value.trim() === '') {
            homeResultsCard.style.display = 'none';
        }
    }

    // Handle learning form submission
    learningForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = learningForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = '<span class="loading"></span> Saving...';
        submitButton.disabled = true;
        
        const question = document.getElementById('question').value;
        const answer = document.getElementById('answer').value;

        try {
            const response = await fetch('/api/learnings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question, answer }),
            });

            if (response.ok) {
                learningForm.reset();
                // Show success message
                const successAlert = document.createElement('div');
                successAlert.className = 'alert alert-success mt-3';
                successAlert.textContent = 'Learning saved successfully!';
                learningForm.appendChild(successAlert);
                setTimeout(() => successAlert.remove(), 3000);
                
                // Switch to show learnings page
                navigateToPage('show-learning');
            } else {
                throw new Error('Failed to save learning');
            }
        } catch (error) {
            console.error('Error:', error);
            const errorAlert = document.createElement('div');
            errorAlert.className = 'alert alert-danger mt-3';
            errorAlert.textContent = 'Error saving learning. Please try again.';
            learningForm.appendChild(errorAlert);
            setTimeout(() => errorAlert.remove(), 3000);
        } finally {
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    });
    
    // Handle masail form submission
    masailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = masailForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = '<span class="loading"></span> Saving...';
        submitButton.disabled = true;
        
        const question = document.getElementById('masailQuestion').value;
        const answer = document.getElementById('masailAnswer').value;
        const category = document.getElementById('masailCategory').value;

        try {
            const response = await fetch('/api/masail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question, answer, category }),
            });

            if (response.ok) {
                masailForm.reset();
                // Show success message
                const successAlert = document.createElement('div');
                successAlert.className = 'alert alert-success mt-3';
                successAlert.textContent = 'Masail saved successfully!';
                masailForm.appendChild(successAlert);
                setTimeout(() => successAlert.remove(), 3000);
                
                // Switch to show masail page
                navigateToPage('show-masail');
            } else {
                throw new Error('Failed to save masail');
            }
        } catch (error) {
            console.error('Error:', error);
            const errorAlert = document.createElement('div');
            errorAlert.className = 'alert alert-danger mt-3';
            errorAlert.textContent = 'Error saving masail. Please try again.';
            masailForm.appendChild(errorAlert);
            setTimeout(() => errorAlert.remove(), 3000);
        } finally {
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    });

    // Filter category handler
    filterCategorySelect.addEventListener('change', () => {
        loadMasail(filterCategorySelect.value);
    });

    // Handle search input
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = searchInput.value.trim();
        
        // Clear suggestions and results if query is empty
        if (query.length === 0) {
            suggestionsDiv.style.display = 'none';
            homeResultsCard.style.display = 'none';
            return;
        }

        // Debounce the suggestions request
        debounceTimer = setTimeout(() => {
            getSuggestions(query);
        }, 300);
    });

    // Handle search button click
    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            searchLearnings(query);
            suggestionsDiv.style.display = 'none';
        }
    });

    // Add search on Enter key press
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                searchLearnings(query);
                suggestionsDiv.style.display = 'none';
            }
        }
    });

    // Handle suggestion click
    suggestionsDiv.addEventListener('click', (e) => {
        if (e.target.closest('.suggestion-item')) {
            const suggestionItem = e.target.closest('.suggestion-item');
            const question = suggestionItem.dataset.question;
            const source = suggestionItem.dataset.source || 'learning';
            
            searchInput.value = question;
            searchLearnings(question);
            suggestionsDiv.style.display = 'none';
            
            // If it's a masail suggestion, switch to the masail tab after search
            if (source === 'masail') {
                setTimeout(() => {
                    const masailTab = document.getElementById('masail-tab');
                    if (masailTab) {
                        masailTab.click();
                    }
                }, 500);
            }
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            suggestionsDiv.style.display = 'none';
        }
    });

    // Function to get suggestions
    async function getSuggestions(query) {
        try {
            const response = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`);
            const suggestions = await response.json();
            displaySuggestions(suggestions, query);
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Function to display suggestions
    function displaySuggestions(suggestions, query) {
        if (suggestions.length === 0 || !query) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.innerHTML = '';
        suggestions.forEach(suggestion => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.dataset.question = suggestion.question;
            div.dataset.source = suggestion.source || 'learning';
            
            // Highlight the matching part of the suggestion
            const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            const highlightedQuestion = suggestion.question.replace(regex, '<span class="suggestion-highlight">$1</span>');
            
            // Add badge for source
            const sourceBadge = suggestion.source === 'masail' 
                ? '<span class="badge bg-info ms-2">Masail</span>' 
                : '<span class="badge bg-secondary ms-2">Learning</span>';
                
            div.innerHTML = highlightedQuestion + sourceBadge;
            suggestionsDiv.appendChild(div);
        });
        
        // Position the suggestions dropdown below the search input
        const searchContainer = searchInput.closest('.search-container');
        suggestionsDiv.style.display = 'block';
        suggestionsDiv.style.width = '100%';
        suggestionsDiv.style.position = 'relative';
        suggestionsDiv.style.zIndex = '1000';
        
        // Make sure the suggestions div is visible
        setTimeout(() => {
            // Scroll into view if needed
            if (suggestionsDiv.getBoundingClientRect().bottom > window.innerHeight) {
                suggestionsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    }

    // Function to load all learnings
    async function loadLearnings() {
        try {
            const response = await fetch('/api/learnings');
            const learnings = await response.json();
            displayLearnings(learnings, null, resultsDiv);
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    // Function to load all masail with optional category filter
    async function loadMasail(category = '') {
        try {
            const url = category ? `/api/masail?category=${encodeURIComponent(category)}` : '/api/masail';
            
            // Show loading indicator
            masailResultsDiv.innerHTML = '<div class="text-center p-4"><span class="loading"></span><p class="mt-3">Loading Masail...</p></div>';
            
            const response = await fetch(url);
            const masail = await response.json();
            
            displayMasail(masail);
        } catch (error) {
            console.error('Error:', error);
            masailResultsDiv.innerHTML = '<div class="alert alert-danger">Error loading masail</div>';
        }
    }

    // Function to search learnings
    async function searchLearnings(query) {
        try {
            // Make sure we're on the home page
            navigateToPage('home');
            
            // Show the results card
            homeResultsCard.style.display = 'block';
            
            // Show loading indicator in the results div
            homeResultsDiv.innerHTML = '<div class="text-center p-4"><span class="loading"></span><p class="mt-3">Searching...</p></div>';
            
            // Fetch both learnings and masail in parallel
            const [learningsResponse, masailResponse] = await Promise.all([
                fetch(`/api/search?q=${encodeURIComponent(query)}`),
                fetch(`/api/masail/search?q=${encodeURIComponent(query)}`)
            ]);
            
            const [learnings, masail] = await Promise.all([
                learningsResponse.json(),
                masailResponse.json()
            ]);
            
            // Clear the results container
            homeResultsDiv.innerHTML = '';
            
            // Add search feedback
            const searchHeader = document.createElement('div');
            searchHeader.className = 'search-header mb-3';
            searchHeader.innerHTML = `<h6>Search results for: "${query}"</h6>`;
            homeResultsDiv.appendChild(searchHeader);
            
            // Create a tab system for displaying results
            const tabContainer = document.createElement('div');
            tabContainer.className = 'mb-3';
            tabContainer.innerHTML = `
                <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="learnings-tab" data-bs-toggle="tab" 
                            data-bs-target="#learnings-results" type="button" role="tab" aria-selected="true">
                            <i class="bi bi-book-fill me-1"></i>Learnings (${learnings.length})
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="masail-tab" data-bs-toggle="tab" 
                            data-bs-target="#masail-results" type="button" role="tab" aria-selected="false">
                            <i class="bi bi-question-circle-fill me-1"></i>Masail (${masail.length})
                        </button>
                    </li>
                </ul>
                <div class="tab-content pt-3">
                    <div class="tab-pane fade show active" id="learnings-results" role="tabpanel"></div>
                    <div class="tab-pane fade" id="masail-results" role="tabpanel"></div>
                </div>
            `;
            homeResultsDiv.appendChild(tabContainer);
            
            // Display results in their respective tabs
            const learningsTab = document.getElementById('learnings-results');
            const masailTab = document.getElementById('masail-results');
            
            if (learnings.length === 0) {
                learningsTab.innerHTML = '<div class="list-group-item">No learnings found</div>';
            } else {
                displayLearnings(learnings, null, learningsTab);
            }
            
            if (masail.length === 0) {
                masailTab.innerHTML = '<div class="list-group-item">No masail found</div>';
            } else {
                displayMasail(masail, masailTab);
            }
            
            // Scroll to results
            homeResultsCard.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error:', error);
            homeResultsDiv.innerHTML = '<div class="alert alert-danger">Error searching content</div>';
        }
    }

    // Function to display learnings
    function displayLearnings(learnings, headerElement = null, targetDiv = resultsDiv) {
        targetDiv.innerHTML = '';
        
        // Add header element if provided (for search results)
        if (headerElement) {
            targetDiv.appendChild(headerElement);
        }
        
        if (learnings.length === 0) {
            targetDiv.innerHTML += '<div class="list-group-item">No learnings found</div>';
            return;
        }

        learnings.forEach(learning => {
            const div = document.createElement('div');
            div.className = 'list-group-item';
            div.dataset.id = learning._id;
            
            const date = new Date(learning.createdAt).toLocaleDateString();
            
            div.innerHTML = `
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="question">${learning.question}</div>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary edit-learning">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-learning">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="answer">${learning.answer}</div>
                <div class="timestamp">Added on: ${date}</div>
            `;
            
            targetDiv.appendChild(div);
        });

        // Add event listeners for edit and delete buttons
        attachLearningEventListeners(targetDiv);
    }

    // Function to attach event listeners for learning items
    function attachLearningEventListeners(container) {
        container.querySelectorAll('.edit-learning').forEach(button => {
            button.addEventListener('click', handleEditLearning);
        });

        container.querySelectorAll('.delete-learning').forEach(button => {
            button.addEventListener('click', handleDeleteLearning);
        });
    }

    // Function to display masail
    function displayMasail(masail, targetDiv = masailResultsDiv) {
        targetDiv.innerHTML = '';
        
        if (masail.length === 0) {
            targetDiv.innerHTML = '<div class="list-group-item">No masail found</div>';
            return;
        }

        masail.forEach(masail => {
            const div = document.createElement('div');
            div.className = 'list-group-item masail-item';
            div.dataset.id = masail._id;
            
            const date = new Date(masail.createdAt).toLocaleDateString();
            
            // Get category label
            let categoryLabel = '';
            switch(masail.category) {
                case 'salah': categoryLabel = 'Salah (Prayer)'; break;
                case 'zakah': categoryLabel = 'Zakah (Charity)'; break;
                case 'sawm': categoryLabel = 'Sawm (Fasting)'; break;
                case 'hajj': categoryLabel = 'Hajj (Pilgrimage)'; break;
                case 'tahara': categoryLabel = 'Tahara (Purity)'; break;
                case 'muamalat': categoryLabel = 'Muamalat (Transactions)'; break;
                default: categoryLabel = 'Other';
            }
            
            div.innerHTML = `
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="question">${masail.question}</div>
                    <div class="d-flex align-items-center">
                        <span class="badge bg-primary category-badge me-2">${categoryLabel}</span>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary edit-masail">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-masail">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="answer">${masail.answer}</div>
                <div class="timestamp">Added on: ${date}</div>
            `;
            
            targetDiv.appendChild(div);
        });

        // Add event listeners for edit and delete buttons
        attachMasailEventListeners(targetDiv);
    }

    // Function to attach event listeners for masail items
    function attachMasailEventListeners(targetDiv = masailResultsDiv) {
        targetDiv.querySelectorAll('.edit-masail').forEach(button => {
            button.addEventListener('click', handleEditMasail);
        });

        targetDiv.querySelectorAll('.delete-masail').forEach(button => {
            button.addEventListener('click', handleDeleteMasail);
        });
    }

    // Handle delete learning
    async function handleDeleteLearning(e) {
        const item = e.target.closest('.list-group-item');
        const id = item.dataset.id;
        
        itemToDelete = item;
        deleteCallback = async () => {
            try {
                const secretWord = document.getElementById('secretWordDelete').value;
                
                const response = await fetch(`/api/learnings/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ secretWord })
                });
                
                if (response.ok) {
                    item.remove();
                    showAlert('Learning deleted successfully', 'success');
                    return true;
                } else {
                    const data = await response.json();
                    showAlert(data.error || 'Failed to delete learning', 'danger');
                    throw new Error(data.error || 'Failed to delete learning');
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert(error.message || 'Error deleting learning', 'danger');
                throw error; // Re-throw the error to be caught by the confirmation handler
            }
        };
        
        deleteModal.show();
    }

    // Handle edit learning
    async function handleEditLearning(e) {
        const item = e.target.closest('.list-group-item');
        const id = item.dataset.id;
        const question = item.querySelector('.question').textContent;
        const answer = item.querySelector('.answer').textContent;
        
        // Create edit form
        const editForm = document.createElement('form');
        editForm.className = 'edit-form mt-3';
        editForm.innerHTML = `
            <div class="mb-3">
                <label class="form-label">Question/Key Point</label>
                <input type="text" class="form-control" value="${question}" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Answer/Explanation</label>
                <textarea class="form-control" rows="3" required>${answer}</textarea>
            </div>
            <div class="mb-3">
                <label class="form-label">Secret Word</label>
                <input type="password" class="form-control secret-word" required>
            </div>
            <div class="btn-group">
                <button type="submit" class="btn btn-primary">Save</button>
                <button type="button" class="btn btn-secondary cancel-edit">Cancel</button>
            </div>
        `;
        
        // Replace content with edit form
        const originalContent = item.innerHTML;
        item.innerHTML = '';
        item.appendChild(editForm);
        
        // Handle form submission
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newQuestion = editForm.querySelector('input').value;
            const newAnswer = editForm.querySelector('textarea').value;
            const secretWord = editForm.querySelector('.secret-word').value;
            
            try {
                const response = await fetch(`/api/learnings/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        question: newQuestion, 
                        answer: newAnswer,
                        secretWord
                    }),
                });
                
                if (response.ok) {
                    const updatedLearning = await response.json();
                    item.innerHTML = originalContent;
                    item.querySelector('.question').textContent = updatedLearning.question;
                    item.querySelector('.answer').textContent = updatedLearning.answer;
                    showAlert('Learning updated successfully', 'success');
                    
                    // Reattach event listeners after successful edit
                    attachLearningEventListeners(item.parentElement);
                } else {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to update learning');
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert(error.message || 'Error updating learning', 'danger');
            }
        });
        
        // Handle cancel
        editForm.querySelector('.cancel-edit').addEventListener('click', () => {
            item.innerHTML = originalContent;
            // Reattach event listeners after cancel
            attachLearningEventListeners(item.parentElement);
        });
    }

    // Handle delete masail
    async function handleDeleteMasail(e) {
        const item = e.target.closest('.masail-item');
        const id = item.dataset.id;
        
        itemToDelete = item;
        deleteCallback = async () => {
            try {
                const secretWord = document.getElementById('secretWordDelete').value;
                
                const response = await fetch(`/api/masail/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ secretWord })
                });
                
                if (response.ok) {
                    item.remove();
                    showAlert('Masail deleted successfully', 'success');
                    return true;
                } else {
                    const data = await response.json();
                    showAlert(data.error || 'Failed to delete masail', 'danger');
                    throw new Error(data.error || 'Failed to delete masail');
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert(error.message || 'Error deleting masail', 'danger');
                throw error; // Re-throw the error to be caught by the confirmation handler
            }
        };
        
        deleteModal.show();
    }

    // Handle edit masail
    async function handleEditMasail(e) {
        const item = e.target.closest('.masail-item');
        const id = item.dataset.id;
        const question = item.querySelector('.question').textContent;
        const answer = item.querySelector('.answer').textContent;
        const category = item.querySelector('.category-badge').textContent.split(' ')[0].toLowerCase();
        
        // Create edit form
        const editForm = document.createElement('form');
        editForm.className = 'edit-form mt-3';
        editForm.innerHTML = `
            <div class="mb-3">
                <label class="form-label">Question/Ruling</label>
                <input type="text" class="form-control" value="${question}" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Answer/Explanation</label>
                <textarea class="form-control" rows="3" required>${answer}</textarea>
            </div>
            <div class="mb-3">
                <label class="form-label">Category</label>
                <select class="form-control" required>
                    <option value="salah" ${category === 'salah' ? 'selected' : ''}>Salah (Prayer)</option>
                    <option value="zakah" ${category === 'zakah' ? 'selected' : ''}>Zakah (Charity)</option>
                    <option value="sawm" ${category === 'sawm' ? 'selected' : ''}>Sawm (Fasting)</option>
                    <option value="hajj" ${category === 'hajj' ? 'selected' : ''}>Hajj (Pilgrimage)</option>
                    <option value="tahara" ${category === 'tahara' ? 'selected' : ''}>Tahara (Purity)</option>
                    <option value="muamalat" ${category === 'muamalat' ? 'selected' : ''}>Muamalat (Transactions)</option>
                    <option value="other" ${category === 'other' ? 'selected' : ''}>Other</option>
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label">Secret Word</label>
                <input type="password" class="form-control secret-word" required>
            </div>
            <div class="btn-group">
                <button type="submit" class="btn btn-primary">Save</button>
                <button type="button" class="btn btn-secondary cancel-edit">Cancel</button>
            </div>
        `;
        
        // Replace content with edit form
        const originalContent = item.innerHTML;
        item.innerHTML = '';
        item.appendChild(editForm);
        
        // Handle form submission
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newQuestion = editForm.querySelector('input').value;
            const newAnswer = editForm.querySelector('textarea').value;
            const newCategory = editForm.querySelector('select').value;
            const secretWord = editForm.querySelector('.secret-word').value;
            
            try {
                const response = await fetch(`/api/masail/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        question: newQuestion, 
                        answer: newAnswer,
                        category: newCategory,
                        secretWord
                    }),
                });
                
                if (response.ok) {
                    const updatedMasail = await response.json();
                    item.innerHTML = originalContent;
                    item.querySelector('.question').textContent = updatedMasail.question;
                    item.querySelector('.answer').textContent = updatedMasail.answer;
                    
                    // Update category badge
                    const categoryBadge = item.querySelector('.category-badge');
                    switch(updatedMasail.category) {
                        case 'salah': categoryBadge.textContent = 'Salah (Prayer)'; break;
                        case 'zakah': categoryBadge.textContent = 'Zakah (Charity)'; break;
                        case 'sawm': categoryBadge.textContent = 'Sawm (Fasting)'; break;
                        case 'hajj': categoryBadge.textContent = 'Hajj (Pilgrimage)'; break;
                        case 'tahara': categoryBadge.textContent = 'Tahara (Purity)'; break;
                        case 'muamalat': categoryBadge.textContent = 'Muamalat (Transactions)'; break;
                        case 'other': categoryBadge.textContent = 'Other'; break;
                    }
                    
                    showAlert('Masail updated successfully', 'success');
                    
                    // Reattach event listeners after successful edit
                    attachMasailEventListeners();
                } else {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to update masail');
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert(error.message || 'Error updating masail', 'danger');
            }
        });
        
        // Handle cancel
        editForm.querySelector('.cancel-edit').addEventListener('click', () => {
            item.innerHTML = originalContent;
            // Reattach event listeners after cancel
            attachMasailEventListeners();
        });
    }

    // Helper function to show alerts
    function showAlert(message, type) {
        const alertBox = document.createElement('div');
        alertBox.className = `alert alert-${type} mt-3 alert-dismissible fade show`;
        alertBox.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.appendChild(alertBox);
        
        // Position it at the top center
        alertBox.style.position = 'fixed';
        alertBox.style.top = '20px';
        alertBox.style.left = '50%';
        alertBox.style.transform = 'translateX(-50%)';
        alertBox.style.zIndex = '9999';
        alertBox.style.minWidth = '300px';
        alertBox.style.textAlign = 'center';
        alertBox.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        
        // Add animation for better visibility
        alertBox.style.animation = 'fadeInDown 0.5s ease';
        
        // Remove after 3 seconds with fade-out animation
        setTimeout(() => {
            alertBox.style.animation = 'fadeOut 0.5s ease forwards';
            setTimeout(() => {
                alertBox.remove();
            }, 500);
        }, 3000);
    }
    
    // Questions functionality
    
    // Load all questions
    async function loadQuestions() {
        try {
            const response = await fetch('/api/questions');
            const questions = await response.json();
            displayQuestions(questions);
        } catch (error) {
            console.error('Error loading questions:', error);
            showAlert('Failed to load questions', 'danger');
        }
    }
    
    // Display questions in the list
    function displayQuestions(questions) {
        questionsListDiv.innerHTML = '';
        
        if (questions.length === 0) {
            questionsListDiv.innerHTML = '<div class="text-center mt-4 text-muted">No questions added yet</div>';
            return;
        }
        
        // Create a document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        questions.forEach(question => {
            const questionItem = document.createElement('div');
            questionItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            questionItem.dataset.id = question._id;
            questionItem.dataset.questionId = question._id;
            
            // Create checkbox for completion status
            const checkboxContainer = document.createElement('div');
            checkboxContainer.className = 'form-check';
            
            const checkbox = document.createElement('input');
            checkbox.className = 'form-check-input question-checkbox';
            checkbox.type = 'checkbox';
            checkbox.checked = question.completed;
            checkbox.dataset.id = question._id;
            
            // Create question text
            const questionText = document.createElement('label');
            questionText.className = 'ms-2 form-check-label';
            questionText.textContent = question.question;
            
            // If completed, add strikethrough style
            if (question.completed) {
                questionText.style.textDecoration = 'line-through';
                questionText.style.color = '#6c757d';
            }
            
            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(questionText);
            
            // Create delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-danger ms-2 delete-question';
            deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
            deleteBtn.dataset.id = question._id;
            deleteBtn.setAttribute('aria-label', 'Delete question');
            
            // Combine elements
            const leftSide = document.createElement('div');
            leftSide.appendChild(checkboxContainer);
            
            questionItem.appendChild(leftSide);
            questionItem.appendChild(deleteBtn);
            
            fragment.appendChild(questionItem);
        });
        
        // Add all items at once for better performance
        questionsListDiv.appendChild(fragment);
        
        // Attach event listeners
        attachQuestionEventListeners();
    }
    
    // Handle question form submission
    if (questionForm) {
        questionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const question = questionInput.value.trim();
            if (!question) return;
            
            try {
                const response = await fetch('/api/questions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ question }),
                });
                
                if (response.ok) {
                    questionInput.value = '';
                    loadQuestions();
                } else {
                    throw new Error('Failed to add question');
                }
            } catch (error) {
                console.error('Error adding question:', error);
                showAlert('Failed to add question', 'danger');
            }
        });
    }
    
    // Initialize event delegation for questions list
    if (questionsListDiv) {
        // Add a click handler to the entire questions list container
        questionsListDiv.addEventListener('click', function(e) {
            // Handle delete button clicks via delegation
            if (e.target.classList.contains('delete-question') || 
                e.target.closest('.delete-question')) {
                
                e.preventDefault();
                e.stopPropagation();
                
                // Find the button element
                const button = e.target.classList.contains('delete-question') 
                    ? e.target 
                    : e.target.closest('.delete-question');
                    
                if (button && button.dataset.id) {
                    // Show delete confirmation modal
                    showDeleteConfirmation(button.dataset.id);
                }
            }
        });
    }
    
    // Function to show delete confirmation modal
    function showDeleteConfirmation(id) {
        // Store the ID to delete
        itemToDelete = id;
        
        // Set up the delete callback
        deleteCallback = async () => {
            try {
                const secretWord = document.getElementById('secretWordDelete').value;
                
                const response = await fetch(`/api/questions/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ secretWord })
                });
                
                if (response.ok) {
                    // Find and remove the question item
                    const questionItem = document.querySelector(`.list-group-item[data-id="${id}"]`) || 
                                        document.querySelector(`.list-group-item[data-question-id="${id}"]`);
                    
                    if (questionItem) {
                        questionItem.remove();
                        
                        // Check if there are any questions left
                        if (questionsListDiv.children.length === 0) {
                            questionsListDiv.innerHTML = '<div class="text-center mt-4 text-muted">No questions added yet</div>';
                        }
                    } else {
                        // Reload all questions if item not found
                        loadQuestions();
                    }
                    
                    showAlert('Question deleted successfully', 'success');
                    return true;
                } else {
                    const data = await response.json();
                    showAlert(data.error || 'Failed to delete question', 'danger');
                    throw new Error(data.error || 'Failed to delete question');
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert(error.message || 'Error deleting question', 'danger');
                throw error; // Re-throw the error to be caught by the confirmation handler
            }
        };
        
        // Show the delete confirmation modal
        deleteModal.show();
    }
    
    // Attach event listeners to question items
    function attachQuestionEventListeners() {
        // Checkbox toggle event
        document.querySelectorAll('.question-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const id = e.target.dataset.id;
                try {
                    const response = await fetch(`/api/questions/${id}/toggle`, {
                        method: 'PUT'
                    });
                    
                    if (response.ok) {
                        // Update UI
                        const label = e.target.nextElementSibling;
                        if (e.target.checked) {
                            label.style.textDecoration = 'line-through';
                            label.style.color = '#6c757d';
                        } else {
                            label.style.textDecoration = 'none';
                            label.style.color = '';
                        }
                    } else {
                        throw new Error('Failed to update question');
                    }
                } catch (error) {
                    console.error('Error toggling question:', error);
                    showAlert('Failed to update question', 'danger');
                    // Revert checkbox state
                    e.target.checked = !e.target.checked;
                }
            });
        });
        
        // We're using event delegation for delete buttons so this is no longer needed
        // But keeping it as a fallback
        document.querySelectorAll('.delete-question').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Get question ID from button's data attribute
                const id = this.dataset.id;
                if (!id) {
                    console.error('Question ID not found');
                    return;
                }
                
                // Show delete confirmation modal
                showDeleteConfirmation(id);
            });
        });
    }
});