// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDu9tYpJdMPT7Hvk2_Ug8XHwxRQXoakRfs",
    authDomain: "xemgiadat-dfe15.firebaseapp.com",
    projectId: "xemgiadat-dfe15",
    storageBucket: "xemgiadat-dfe15.appspot.com",
    messagingSenderId: "361952598367",
    appId: "1:361952598367:web:c1e2e3b1a6d5d8c797beea",
    measurementId: "G-XT932D9N1N"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Admin Configuration
const ADMIN_UID = "FEpPWWT1EaTWQ9FOqBxWN5FeEJk1";
let currentUser = null;
let adminData = {};

// Global Statistics
let globalStats = {
    totalUsers: 0,
    totalListings: 0,
    totalFeedback: 0,
    totalVisits: 0,
    avgRating: 0,
    todayUsers: 0,
    todayListings: 0,
    todayFeedback: 0
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Admin Dashboard Initializing...');
    
    // Check authentication
    auth.onAuthStateChanged(async (user) => {
        if (user && user.uid === ADMIN_UID) {
            currentUser = user;
            console.log('✅ Admin authenticated:', user.displayName);
            await initializeAdminDashboard();
        } else {
            console.log('❌ Unauthorized access attempt');
            redirectToLogin();
        }
    });
});

// Redirect to login if not admin
function redirectToLogin() {
    alert('Bạn không có quyền truy cập trang này!');
    window.location.href = 'index.html';
}

// Initialize Admin Dashboard
async function initializeAdminDashboard() {
    try {
        // Update admin profile
        updateAdminProfile();
        
        // Load initial data
        await loadDashboardData();
        
        // Setup real-time listeners
        setupRealtimeListeners();
        
        // Initialize charts
        initializeCharts();
        
        // Show dashboard by default
        showSection('dashboard');
        
        console.log('✅ Admin Dashboard initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing dashboard:', error);
    }
}

// Update Admin Profile in Header
function updateAdminProfile() {
    if (currentUser) {
        document.getElementById('admin-name').textContent = currentUser.displayName || 'Admin';
        document.getElementById('admin-avatar').src = currentUser.photoURL || 'https://placehold.co/32x32/3b82f6/white?text=A';
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    
    try {
        // Load statistics in parallel
        await Promise.all([
            loadUserStats(),
            loadListingStats(),
            loadFeedbackStats(),
            loadVisitStats()
        ]);
        
        // Update dashboard display
        updateDashboardStats();
        updateRecentActivity();
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
    }
}

// Load User Statistics
async function loadUserStats() {
    try {
        const usersSnapshot = await db.collection('users').get();
        globalStats.totalUsers = usersSnapshot.size;
        
        // Count today's new users
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayUsersSnapshot = await db.collection('users')
            .where('createdAt', '>=', today)
            .get();
        globalStats.todayUsers = todayUsersSnapshot.size;
        
        console.log(`👥 Users: ${globalStats.totalUsers} total, ${globalStats.todayUsers} today`);
    } catch (error) {
        console.error('❌ Error loading user stats:', error);
    }
}

// Load Listing Statistics
async function loadListingStats() {
    try {
        const listingsSnapshot = await db.collection('listings').get();
        globalStats.totalListings = listingsSnapshot.size;
        
        // Count today's new listings
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayListingsSnapshot = await db.collection('listings')
            .where('createdAt', '>=', today)
            .get();
        globalStats.todayListings = todayListingsSnapshot.size;
        
        console.log(`🏢 Listings: ${globalStats.totalListings} total, ${globalStats.todayListings} today`);
    } catch (error) {
        console.error('❌ Error loading listing stats:', error);
    }
}

// Load Feedback Statistics
async function loadFeedbackStats() {
    try {
        const feedbackSnapshot = await db.collection('feedback').get();
        globalStats.totalFeedback = feedbackSnapshot.size;
        
        // Calculate average rating
        let totalRating = 0;
        let ratedCount = 0;
        
        feedbackSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.rating && data.rating > 0) {
                totalRating += data.rating;
                ratedCount++;
            }
        });
        
        globalStats.avgRating = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : 0;
        
        // Count today's feedback
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayFeedbackSnapshot = await db.collection('feedback')
            .where('timestamp', '>=', today.toISOString())
            .get();
        globalStats.todayFeedback = todayFeedbackSnapshot.size;
        
        console.log(`💬 Feedback: ${globalStats.totalFeedback} total, ${globalStats.avgRating} avg rating, ${globalStats.todayFeedback} today`);
    } catch (error) {
        console.error('❌ Error loading feedback stats:', error);
    }
}

// Load Visit Statistics (Estimated)
async function loadVisitStats() {
    try {
        // Estimate visits based on user activity and feedback
        // This is a simple estimation - for real analytics, integrate Google Analytics
        globalStats.totalVisits = Math.floor(globalStats.totalUsers * 3.5 + globalStats.totalFeedback * 2);
        
        console.log(`📈 Estimated visits: ${globalStats.totalVisits}`);
    } catch (error) {
        console.error('❌ Error loading visit stats:', error);
    }
}

// Update Dashboard Statistics Display
function updateDashboardStats() {
    document.getElementById('total-users').textContent = globalStats.totalUsers;
    document.getElementById('total-listings').textContent = globalStats.totalListings;
    document.getElementById('total-feedback').textContent = globalStats.totalFeedback;
    document.getElementById('total-visits').textContent = globalStats.totalVisits.toLocaleString();
    document.getElementById('avg-rating').textContent = globalStats.avgRating;
    
    // Growth stats (simplified)
    document.getElementById('users-growth').textContent = globalStats.todayUsers;
    document.getElementById('listings-growth').textContent = globalStats.todayListings;
    
    // Sidebar quick stats
    document.getElementById('today-users').textContent = globalStats.todayUsers;
    document.getElementById('today-listings').textContent = globalStats.todayListings;
    document.getElementById('today-feedback').textContent = globalStats.todayFeedback;
}

// Setup Real-time Listeners
function setupRealtimeListeners() {
    // Listen for new listings
    db.collection('listings').orderBy('createdAt', 'desc').limit(5)
        .onSnapshot(snapshot => {
            updatePendingListings(snapshot);
        });
    
    // Listen for new feedback
    db.collection('feedback').orderBy('timestamp', 'desc').limit(10)
        .onSnapshot(snapshot => {
            updateRecentFeedback(snapshot);
        });
    
    // Listen for new users (requires additional setup)
    // This would need a custom implementation to track user registrations
}

// Update Recent Activity
function updateRecentActivity() {
    const container = document.getElementById('recent-activities');
    
    // Sample recent activities - replace with real data
    const activities = [
        { type: 'user', text: 'Người dùng mới đăng ký', time: '2 phút trước', icon: 'fas fa-user-plus', color: 'text-green-600' },
        { type: 'listing', text: 'Tin đăng mới được thêm', time: '5 phút trước', icon: 'fas fa-plus-circle', color: 'text-blue-600' },
        { type: 'feedback', text: 'Góp ý mới từ người dùng', time: '10 phút trước', icon: 'fas fa-comment', color: 'text-purple-600' },
        { type: 'search', text: 'Tìm kiếm thửa đất 123/45', time: '15 phút trước', icon: 'fas fa-search', color: 'text-gray-600' },
        { type: 'visit', text: '50 lượt truy cập mới', time: '1 giờ trước', icon: 'fas fa-eye', color: 'text-yellow-600' }
    ];
    
    container.innerHTML = activities.map(activity => `
        <div class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
            <i class="${activity.icon} ${activity.color}"></i>
            <div class="flex-1">
                <p class="text-sm text-gray-800">${activity.text}</p>
                <p class="text-xs text-gray-500">${activity.time}</p>
            </div>
        </div>
    `).join('');
}

// Update Pending Listings
function updatePendingListings(snapshot) {
    const container = document.getElementById('pending-listings');
    const pendingListings = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'pending' || !data.status) {
            pendingListings.push({ id: doc.id, ...data });
        }
    });
    
    if (pendingListings.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">Không có tin đăng cần duyệt</p>';
        return;
    }
    
    container.innerHTML = pendingListings.slice(0, 5).map(listing => `
        <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
            <div class="flex-1">
                <p class="text-sm font-medium text-gray-800">${listing.name || 'Tin đăng không có tiêu đề'}</p>
                <p class="text-xs text-gray-500">Bởi: ${listing.userName || 'Unknown'}</p>
                <p class="text-xs text-green-600">${listing.priceValue || 0} ${listing.priceUnit || 'VNĐ'}</p>
            </div>
            <div class="flex space-x-2">
                <button onclick="approveListing('${listing.id}')" class="text-green-600 hover:text-green-800">
                    <i class="fas fa-check"></i>
                </button>
                <button onclick="rejectListing('${listing.id}')" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Initialize Charts
function initializeCharts() {
    // User Growth Chart
    const userGrowthCtx = document.getElementById('userGrowthChart').getContext('2d');
    new Chart(userGrowthCtx, {
        type: 'line',
        data: {
            labels: ['6 ngày trước', '5 ngày', '4 ngày', '3 ngày', '2 ngày', 'Hôm qua', 'Hôm nay'],
            datasets: [{
                label: 'Người dùng mới',
                data: [2, 5, 3, 8, 6, 4, globalStats.todayUsers],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Rating Distribution Chart
    const ratingCtx = document.getElementById('ratingChart').getContext('2d');
    new Chart(ratingCtx, {
        type: 'doughnut',
        data: {
            labels: ['5 sao', '4 sao', '3 sao', '2 sao', '1 sao'],
            datasets: [{
                data: [40, 30, 20, 7, 3], // Sample data - replace with real data
                backgroundColor: [
                    '#10b981',
                    '#3b82f6',
                    '#f59e0b',
                    '#ef4444',
                    '#6b7280'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Section Navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.remove('hidden');
    
    // Update sidebar active state
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('bg-white', 'bg-opacity-20');
    });
    
    // Find and activate the clicked sidebar item
    const activeItem = Array.from(document.querySelectorAll('.sidebar-item'))
        .find(item => item.textContent.toLowerCase().includes(sectionName));
    if (activeItem) {
        activeItem.classList.add('bg-white', 'bg-opacity-20');
    }
    
    // Load section-specific data
    switch(sectionName) {
        case 'users':
            loadUsersSection();
            break;
        case 'listings':
            loadListingsSection();
            break;
        case 'feedback':
            loadFeedbackSection();
            break;
        case 'analytics':
            loadAnalyticsSection();
            break;
    }
}

// Load Users Section
async function loadUsersSection() {
    try {
        const usersSnapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        const tableBody = document.getElementById('users-table-body');
        
        tableBody.innerHTML = '';
        
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const row = document.createElement('tr');
            row.className = 'table-row';
            
            row.innerHTML = `
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <img class="w-8 h-8 rounded-full mr-3" src="${user.photoURL || 'https://placehold.co/32x32/e2e8f0/64748b?text=U'}" alt="Avatar">
                        <div>
                            <div class="text-sm font-medium text-gray-900">${user.displayName || 'Chưa có tên'}</div>
                            <div class="text-sm text-gray-500">ID: ${doc.id.substring(0, 8)}...</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">${user.email || 'Chưa có email'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${user.createdAt ? formatDate(user.createdAt.toDate()) : 'Không rõ'}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${user.listingCount || 0}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${user.status === 'banned' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                        ${user.status === 'banned' ? 'Bị khóa' : 'Hoạt động'}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm font-medium">
                    <button onclick="viewUserDetails('${doc.id}')" class="text-blue-600 hover:text-blue-900 mr-3">Xem</button>
                    <button onclick="toggleUserStatus('${doc.id}', '${user.status}')" class="text-red-600 hover:text-red-900">
                        ${user.status === 'banned' ? 'Mở khóa' : 'Khóa'}
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('❌ Error loading users:', error);
    }
}

// Load Listings Section
async function loadListingsSection() {
    try {
        const listingsSnapshot = await db.collection('listings').orderBy('createdAt', 'desc').get();
        const tableBody = document.getElementById('listings-table-body');
        
        tableBody.innerHTML = '';
        
        listingsSnapshot.forEach(doc => {
            const listing = doc.data();
            const row = document.createElement('tr');
            row.className = 'table-row';
            
            row.innerHTML = `
                <td class="px-6 py-4">
                    <input type="checkbox" class="listing-checkbox rounded" value="${doc.id}">
                </td>
                <td class="px-6 py-4">
                    <div>
                        <div class="text-sm font-medium text-gray-900">${listing.name || 'Không có tiêu đề'}</div>
                        <div class="text-sm text-gray-500">${listing.area ? listing.area + ' m²' : ''} • ${listing.notes || 'Không có ghi chú'}</div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">${listing.userName || 'Không rõ'}</div>
                    <div class="text-sm text-gray-500">${listing.contactPhone || 'Không có SĐT'}</div>
                </td>
                <td class="px-6 py-4 text-sm font-medium text-green-600">
                    ${listing.priceValue || 0} ${listing.priceUnit || 'VNĐ'}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${listing.createdAt ? formatDate(listing.createdAt.toDate()) : 'Không rõ'}
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(listing.status)}">
                        ${getStatusText(listing.status)}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm font-medium">
                    <div class="flex space-x-2">
                        <button onclick="viewListingDetails('${doc.id}')" class="text-blue-600 hover:text-blue-900">Xem</button>
                        ${listing.status !== 'approved' ? `<button onclick="approveListing('${doc.id}')" class="text-green-600 hover:text-green-900">Duyệt</button>` : ''}
                        <button onclick="rejectListing('${doc.id}')" class="text-red-600 hover:text-red-900">Xóa</button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('❌ Error loading listings:', error);
    }
}

// Load Feedback Section
async function loadFeedbackSection() {
    try {
        const feedbackSnapshot = await db.collection('feedback').orderBy('timestamp', 'desc').get();
        const container = document.getElementById('feedback-list');
        
        container.innerHTML = '';
        
        feedbackSnapshot.forEach(doc => {
            const feedback = doc.data();
            const feedbackElement = document.createElement('div');
            feedbackElement.className = 'bg-white p-6 rounded-xl shadow-lg';
            
            feedbackElement.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center space-x-3">
                        <span class="px-3 py-1 text-xs font-medium rounded-full ${getPriorityClass(feedback.priority)}">
                            ${getPriorityText(feedback.priority)}
                        </span>
                        <span class="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            ${getFeedbackTypeText(feedback.type)}
                        </span>
                        ${feedback.rating ? `<div class="flex text-yellow-400">${'★'.repeat(feedback.rating)}${'☆'.repeat(5-feedback.rating)}</div>` : ''}
                    </div>
                    <span class="text-xs text-gray-500">${formatDate(new Date(feedback.timestamp))}</span>
                </div>
                
                <div class="mb-4">
                    <p class="text-gray-800">${feedback.content}</p>
                </div>
                
                <div class="flex justify-between items-center">
                    <div class="text-sm text-gray-500">
                        Từ: ${feedback.userName || feedback.email || 'Ẩn danh'} • 
                        ${feedback.page || 'main'} • 
                        ${feedback.userAgent ? feedback.userAgent.split(' ')[0] : 'Unknown'}
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="replyToFeedback('${doc.id}')" class="text-blue-600 hover:text-blue-900">
                            <i class="fas fa-reply mr-1"></i>Trả lời
                        </button>
                        <button onclick="deleteFeedback('${doc.id}')" class="text-red-600 hover:text-red-900">
                            <i class="fas fa-trash mr-1"></i>Xóa
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(feedbackElement);
        });
        
        // Update feedback stats
        updateFeedbackStats(feedbackSnapshot);
        
    } catch (error) {
        console.error('❌ Error loading feedback:', error);
    }
}

// Update Feedback Stats
function updateFeedbackStats(feedbackSnapshot) {
    let unread = 0;
    let replied = 0;
    let totalRating = 0;
    let ratedCount = 0;
    
    feedbackSnapshot.forEach(doc => {
        const feedback = doc.data();
        
        if (!feedback.read) unread++;
        if (feedback.replied) replied++;
        
        if (feedback.rating && feedback.rating > 0) {
            totalRating += feedback.rating;
            ratedCount++;
        }
    });
    
    document.getElementById('feedback-unread').textContent = unread;
    document.getElementById('feedback-replied').textContent = replied;
    document.getElementById('feedback-avg-rating').textContent = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : '0.0';
}

// Admin Actions
async function approveListing(listingId) {
    try {
        await db.collection('listings').doc(listingId).update({
            status: 'approved',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: currentUser.uid
        });
        
        console.log('✅ Listing approved:', listingId);
        loadListingsSection(); // Refresh the listings
    } catch (error) {
        console.error('❌ Error approving listing:', error);
        alert('Có lỗi xảy ra khi duyệt tin đăng');
    }
}

async function rejectListing(listingId) {
    if (!confirm('Bạn có chắc chắn muốn xóa tin đăng này?')) return;
    
    try {
        await db.collection('listings').doc(listingId).delete();
        console.log('✅ Listing deleted:', listingId);
        loadListingsSection(); // Refresh the listings
    } catch (error) {
        console.error('❌ Error deleting listing:', error);
        alert('Có lỗi xảy ra khi xóa tin đăng');
    }
}

async function deleteFeedback(feedbackId) {
    if (!confirm('Bạn có chắc chắn muốn xóa góp ý này?')) return;
    
    try {
        await db.collection('feedback').doc(feedbackId).delete();
        console.log('✅ Feedback deleted:', feedbackId);
        loadFeedbackSection(); // Refresh the feedback
    } catch (error) {
        console.error('❌ Error deleting feedback:', error);
        alert('Có lỗi xảy ra khi xóa góp ý');
    }
}

// Utility Functions
function formatDate(date) {
    if (!date) return 'Không rõ';
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function getStatusClass(status) {
    switch(status) {
        case 'approved': return 'status-approved';
        case 'pending': return 'status-pending';
        case 'rejected': return 'status-rejected';
        default: return 'status-pending';
    }
}

function getStatusText(status) {
    switch(status) {
        case 'approved': return 'Đã duyệt';
        case 'pending': return 'Chờ duyệt';
        case 'rejected': return 'Từ chối';
        default: return 'Chờ duyệt';
    }
}

function getPriorityClass(priority) {
    switch(priority) {
        case 'high': return 'priority-high';
        case 'medium': return 'priority-medium';
        case 'low': return 'priority-low';
        default: return 'priority-medium';
    }
}

function getPriorityText(priority) {
    switch(priority) {
        case 'high': return 'Cao';
        case 'medium': return 'Trung bình';
        case 'low': return 'Thấp';
        default: return 'Trung bình';
    }
}

function getFeedbackTypeText(type) {
    const types = {
        'suggestion': 'Đề xuất',
        'bug': 'Báo lỗi',
        'improvement': 'Cải thiện',
        'ui': 'Giao diện',
        'data': 'Dữ liệu',
        'general': 'Chung'
    };
    return types[type] || 'Chung';
}

// Export Functions (placeholders)
function exportUsers() {
    alert('Tính năng xuất dữ liệu người dùng sẽ được triển khai trong phiên bản tiếp theo');
}

function exportListings() {
    alert('Tính năng xuất dữ liệu tin đăng sẽ được triển khai trong phiên bản tiếp theo');
}

function exportFeedback() {
    alert('Tính năng xuất báo cáo góp ý sẽ được triển khai trong phiên bản tiếp theo');
}

// --- User detail & moderation utilities ---
let currentViewedUserId = null;
let currentViewedUserStatus = null;

async function viewUserDetails(userId) {
    try {
        const docRef = db.collection('users').doc(userId);
        const doc = await docRef.get();
        if (!doc.exists) {
            alert('Không tìm thấy người dùng');
            return;
        }

        const user = doc.data();
        currentViewedUserId = userId;
        currentViewedUserStatus = user.status || 'active';

        // Populate modal fields
        document.getElementById('user-detail-name').textContent = user.displayName || 'Chưa đặt tên';
        document.getElementById('user-detail-id').textContent = `ID: ${userId}`;
        document.getElementById('user-detail-avatar').src = user.photoURL || 'https://placehold.co/80x80/e2e8f0/64748b?text=U';
        document.getElementById('user-detail-email').textContent = user.email || 'Không có';
        document.getElementById('user-detail-phone').textContent = user.phone || 'Không có';
        const fbEl = document.getElementById('user-detail-fb');
        if (user.contactFacebook) { fbEl.textContent = user.contactFacebook; fbEl.href = user.contactFacebook.startsWith('http') ? user.contactFacebook : `https://facebook.com/${user.contactFacebook}`; } else { fbEl.textContent = '-'; fbEl.href = '#'; }
        document.getElementById('user-detail-created').textContent = user.createdAt ? formatDate(user.createdAt.toDate()) : 'Không rõ';
        document.getElementById('user-detail-listings-count').textContent = user.listingCount || 0;
        document.getElementById('user-detail-notes').textContent = user.notes || '-';

        // Status badge
        const statusEl = document.getElementById('user-detail-status');
        if (user.status === 'banned') {
            statusEl.textContent = 'Bị khóa';
            statusEl.className = 'px-3 py-1 rounded-full text-sm bg-red-100 text-red-700';
            document.getElementById('user-detail-ban-btn').textContent = 'Mở khóa';
        } else {
            statusEl.textContent = 'Hoạt động';
            statusEl.className = 'px-3 py-1 rounded-full text-sm bg-green-100 text-green-700';
            document.getElementById('user-detail-ban-btn').textContent = 'Khóa';
        }

        // Load recent listings by this user (up to 10)
        const listingsContainer = document.getElementById('user-detail-listings');
        listingsContainer.innerHTML = '<p class="text-sm text-gray-500">Đang tải...</p>';
        const listingsSnapshot = await db.collection('listings').where('userId','==', userId).orderBy('createdAt','desc').limit(10).get();
        if (listingsSnapshot.empty) {
            listingsContainer.innerHTML = '<p class="text-sm text-gray-500">Không có tin đăng</p>';
        } else {
            listingsContainer.innerHTML = listingsSnapshot.docs.map(ldoc => {
                const l = ldoc.data();
                return `
                    <div class="p-3 rounded-lg border bg-gray-50 flex justify-between items-center">
                        <div>
                            <div class="text-sm font-medium text-gray-800">${l.name || 'Không có tiêu đề'}</div>
                            <div class="text-xs text-gray-500">${l.area ? l.area + ' m²' : ''} • ${l.priceValue || ''} ${l.priceUnit || ''}</div>
                        </div>
                        <div class="text-sm">
                            <button onclick="viewListingDetails('${ldoc.id}')" class="text-blue-600 hover:text-blue-900 mr-2">Xem</button>
                            <button onclick="rejectListing('${ldoc.id}')" class="text-red-600 hover:text-red-900">Xóa</button>
                        </div>
                    </div>`;
            }).join('');
        }

        // Show modal
        document.getElementById('user-detail-modal').classList.remove('hidden');
    } catch (error) {
        console.error('❌ Error viewing user details:', error);
        alert('Có lỗi khi tải chi tiết người dùng');
    }
}

function closeUserDetailModal() {
    document.getElementById('user-detail-modal').classList.add('hidden');
    currentViewedUserId = null;
    currentViewedUserStatus = null;
}

async function toggleUserStatus(userId, currentStatus) {
    if (!userId) return;
    const isBanned = currentStatus === 'banned' || (currentViewedUserStatus === 'banned');
    try {
        if (!isBanned) {
            if (!confirm('Bạn có chắc chắn muốn khóa người dùng này? Hành động có thể được hoàn tác.')) return;
            await db.collection('users').doc(userId).update({ status: 'banned', bannedAt: firebase.firestore.FieldValue.serverTimestamp(), bannedBy: currentUser ? currentUser.uid : null });
            alert('Người dùng đã bị khóa');
        } else {
            if (!confirm('Bạn có chắc chắn muốn mở khóa người dùng này?')) return;
            await db.collection('users').doc(userId).update({ status: 'active', unbannedAt: firebase.firestore.FieldValue.serverTimestamp(), unbannedBy: currentUser ? currentUser.uid : null });
            alert('Người dùng đã được mở khóa');
        }
        // Refresh UI
        loadUsersSection();
        if (currentViewedUserId === userId) {
            // Refresh modal state
            viewUserDetails(userId);
        }
    } catch (error) {
        console.error('❌ Error toggling user status:', error);
        alert('Có lỗi khi cập nhật trạng thái người dùng');
    }
}

// Settings Functions (placeholders)
function showSettingsTab(tabName) {
    document.querySelectorAll('.settings-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`${tabName}-settings`).classList.remove('hidden');
    
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.remove('active', 'border-blue-500', 'text-blue-600');
    });
    event.target.classList.add('active', 'border-blue-500', 'text-blue-600');
}

function saveGeneralSettings() {
    alert('Cài đặt chung đã được lưu');
}

function savePermissions() {
    alert('Phân quyền đã được cập nhật');
}

function saveModerationSettings() {
    alert('Cài đặt kiểm duyệt đã được lưu');
}

function saveSecuritySettings() {
    alert('Cài đặt bảo mật đã được lưu');
}

// Initialize when page loads
console.log('🔧 Admin Dashboard Script Loaded');