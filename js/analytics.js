/* ================================================================== */
/* ===== [09] الملف: 09-analytics.js - نظام التحليلات والإحصائيات ===== */
/* ================================================================== */

// ===== [9.1] نظام التحليلات =====
const AnalyticsSystem = {
    // البيانات
    stats: {
        totalUsers: 0,
        totalProducts: 0,
        totalOrders: 0,
        totalSales: 0,
        totalRevenue: 0,
        activeMerchants: 0,
        activeDelivery: 0,
        pendingOrders: 0
    },
    
    // إحصائيات يومية
    dailyStats: [],
    
    // إحصائيات شهرية
    monthlyStats: [],
    
    // إحصائيات حسب التاجر
    merchantStats: {},
    
    // إحصائيات حسب المنتج
    productStats: {},
    
    // التهيئة
    init() {
        this.loadStats();
        this.collectStats();
        console.log('📊 نظام التحليلات جاهز');
    },
    
    // تحميل الإحصائيات
    loadStats() {
        const saved = Utils.load('analytics_stats');
        if (saved) {
            this.stats = saved.stats || this.stats;
            this.dailyStats = saved.dailyStats || [];
            this.monthlyStats = saved.monthlyStats || [];
            this.merchantStats = saved.merchantStats || {};
            this.productStats = saved.productStats || {};
        }
    },
    
    // حفظ الإحصائيات
    saveStats() {
        Utils.save('analytics_stats', {
            stats: this.stats,
            dailyStats: this.dailyStats,
            monthlyStats: this.monthlyStats,
            merchantStats: this.merchantStats,
            productStats: this.productStats
        });
    },
    
    // جمع الإحصائيات
    collectStats() {
        // إحصائيات المستخدمين
        if (window.Auth && Auth.users) {
            this.stats.totalUsers = Auth.users.length;
            this.stats.activeMerchants = Auth.users.filter(u => u.role === 'merchant' || u.role === 'merchant_approved').length;
        }
        
        // إحصائيات المنتجات
        if (window.Shop && Shop.products) {
            this.stats.totalProducts = Shop.products.length;
            this.stats.totalSales = Shop.products.reduce((sum, p) => sum + (p.soldCount || 0), 0);
            this.stats.totalRevenue = Shop.products.reduce((sum, p) => sum + ((p.price || 0) * (p.soldCount || 0)), 0);
        }
        
        // إحصائيات الطلبات
        if (window.Delivery && Delivery.deliveries) {
            this.stats.totalOrders = Delivery.deliveries.length;
            this.stats.pendingOrders = Delivery.deliveries.filter(d => d.status === 'pending' || d.status === 'assigned').length;
            this.stats.activeDelivery = Delivery.drivers.filter(d => d.status === 'busy').length;
        }
        
        this.saveStats();
    },
    
    // تسجيل طلب جديد
    recordOrder(order) {
        const today = new Date().toISOString().split('T')[0];
        
        // تحديث الإحصائيات
        this.stats.totalOrders++;
        this.stats.totalRevenue += order.total || 0;
        
        // تحديث الإحصائيات اليومية
        let daily = this.dailyStats.find(d => d.date === today);
        if (!daily) {
            daily = { date: today, orders: 0, revenue: 0, products: 0 };
            this.dailyStats.push(daily);
        }
        daily.orders++;
        daily.revenue += order.total || 0;
        daily.products += (order.items || []).length;
        
        // الاحتفاظ بآخر 30 يوم فقط
        if (this.dailyStats.length > 30) {
            this.dailyStats = this.dailyStats.slice(-30);
        }
        
        // تحديث إحصائيات التاجر
        if (order.items) {
            order.items.forEach(item => {
                const merchantId = item.merchantId;
                if (merchantId) {
                    if (!this.merchantStats[merchantId]) {
                        this.merchantStats[merchantId] = {
                            name: item.merchantName,
                            totalSales: 0,
                            totalRevenue: 0,
                            products: {}
                        };
                    }
                    this.merchantStats[merchantId].totalSales++;
                    this.merchantStats[merchantId].totalRevenue += (item.price * item.quantity);
                    
                    // تحديث إحصائيات المنتج
                    if (!this.productStats[item.productId]) {
                        this.productStats[item.productId] = {
                            name: item.name,
                            sales: 0,
                            revenue: 0
                        };
                    }
                    this.productStats[item.productId].sales += item.quantity;
                    this.productStats[item.productId].revenue += (item.price * item.quantity);
                }
            });
        }
        
        this.saveStats();
    },
    
    // الحصول على إحصائيات اليوم
    getTodayStats() {
        const today = new Date().toISOString().split('T')[0];
        const daily = this.dailyStats.find(d => d.date === today);
        return daily || { date: today, orders: 0, revenue: 0, products: 0 };
    },
    
    // الحصول على إحصائيات الأسبوع
    getWeekStats() {
        const weekDays = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const daily = this.dailyStats.find(d => d.date === dateStr);
            weekDays.push({
                date: dateStr,
                day: this.getDayName(date.getDay()),
                orders: daily?.orders || 0,
                revenue: daily?.revenue || 0
            });
        }
        
        return weekDays;
    },
    
    // الحصول على إحصائيات الشهر
    getMonthStats() {
        const monthStats = [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        for (let i = 0; i < 12; i++) {
            const month = (currentMonth - i + 12) % 12;
            const year = currentYear - (currentMonth < i ? 1 : 0);
            const monthName = this.getMonthName(month);
            
            const monthData = this.monthlyStats.find(m => m.month === month && m.year === year);
            monthStats.unshift({
                month: monthName,
                orders: monthData?.orders || 0,
                revenue: monthData?.revenue || 0
            });
        }
        
        return monthStats;
    },
    
    // أفضل المنتجات مبيعاً
    getTopProducts(limit = 10) {
        return Object.values(this.productStats)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, limit);
    },
    
    // أفضل التجار
    getTopMerchants(limit = 10) {
        return Object.values(this.merchantStats)
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, limit);
    },
    
    // الحصول على اسم اليوم
    getDayName(day) {
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        return days[day];
    },
    
    // الحصول على اسم الشهر
    getMonthName(month) {
        const months = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return months[month];
    },
    
    // عرض لوحة التحليلات
    showAnalyticsDashboard() {
        if (!Auth.currentUser || Auth.currentUser.role !== 'admin') {
            Utils.showNotification('غير مصرح - هذه الصفحة للمدير فقط', 'error');
            return;
        }
        
        this.collectStats();
        const todayStats = this.getTodayStats();
        const weekStats = this.getWeekStats();
        const topProducts = this.getTopProducts(5);
        const topMerchants = this.getTopMerchants(5);
        
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content modal-lg" style="max-width: 1000px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2><i class="fas fa-chart-line"></i> لوحة التحليلات والإحصائيات</h2>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <!-- البطاقات الرئيسية -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
                        <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                            <i class="fas fa-users" style="font-size: 32px; color: var(--gold);"></i>
                            <h3 style="margin: 10px 0;">${this.stats.totalUsers}</h3>
                            <small>إجمالي المستخدمين</small>
                        </div>
                        <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                            <i class="fas fa-box" style="font-size: 32px; color: var(--gold);"></i>
                            <h3 style="margin: 10px 0;">${this.stats.totalProducts}</h3>
                            <small>إجمالي المنتجات</small>
                        </div>
                        <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                            <i class="fas fa-shopping-cart" style="font-size: 32px; color: var(--gold);"></i>
                            <h3 style="margin: 10px 0;">${this.stats.totalOrders}</h3>
                            <small>إجمالي الطلبات</small>
                        </div>
                        <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                            <i class="fas fa-coins" style="font-size: 32px; color: var(--gold);"></i>
                            <h3 style="margin: 10px 0;">${this.stats.totalRevenue.toLocaleString()} دج</h3>
                            <small>إجمالي الإيرادات</small>
                        </div>
                    </div>
                    
                    <!-- إحصائيات اليوم -->
                    <div style="background: var(--glass); border-radius: 15px; padding: 20px; margin-bottom: 20px;">
                        <h3><i class="fas fa-calendar-day"></i> إحصائيات اليوم</h3>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px;">
                            <div style="text-align: center;">
                                <div style="font-size: 28px; color: var(--gold);">${todayStats.orders}</div>
                                <small>طلبات اليوم</small>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 28px; color: var(--gold);">${todayStats.products}</div>
                                <small>منتجات مباعة</small>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 28px; color: var(--gold);">${todayStats.revenue.toLocaleString()} دج</div>
                                <small>إيرادات اليوم</small>
                            </div>
                        </div>
                    </div>
                    
                    <!-- إحصائيات الأسبوع -->
                    <div style="background: var(--glass); border-radius: 15px; padding: 20px; margin-bottom: 20px;">
                        <h3><i class="fas fa-chart-bar"></i> إحصائيات الأسبوع</h3>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                <thead>
                                    <tr style="border-bottom: 1px solid rgba(255,215,0,0.3);">
                                        <th style="padding: 10px; text-align: right;">اليوم</th>
                                        <th style="padding: 10px; text-align: center;">الطلبات</th>
                                        <th style="padding: 10px; text-align: center;">الإيرادات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${weekStats.map(day => `
                                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                                            <td style="padding: 10px;">${day.day} (${day.date})</td>
                                            <td style="padding: 10px; text-align: center;">${day.orders}</td>
                                            <td style="padding: 10px; text-align: center;">${day.revenue.toLocaleString()} دج</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- أفضل المنتجات -->
                    <div style="background: var(--glass); border-radius: 15px; padding: 20px; margin-bottom: 20px;">
                        <h3><i class="fas fa-crown"></i> أفضل المنتجات مبيعاً</h3>
                        <div style="margin-top: 15px;">
                            ${topProducts.map((p, i) => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                    <div>
                                        <span style="color: var(--gold); font-weight: bold;">#${i + 1}</span>
                                        <span style="margin-right: 10px;">${p.name}</span>
                                    </div>
                                    <div>
                                        <span>${p.sales} قطعة</span>
                                        <span style="margin-right: 15px; color: var(--gold);">${p.revenue.toLocaleString()} دج</span>
                                    </div>
                                </div>
                            `).join('')}
                            ${topProducts.length === 0 ? '<p style="text-align: center;">لا توجد بيانات</p>' : ''}
                        </div>
                    </div>
                    
                    <!-- أفضل التجار -->
                    <div style="background: var(--glass); border-radius: 15px; padding: 20px;">
                        <h3><i class="fas fa-store"></i> أفضل التجار</h3>
                        <div style="margin-top: 15px;">
                            ${topMerchants.map((m, i) => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                    <div>
                                        <span style="color: var(--gold); font-weight: bold;">#${i + 1}</span>
                                        <span style="margin-right: 10px;">${m.name}</span>
                                    </div>
                                    <div>
                                        <span>${m.totalSales} مبيعات</span>
                                        <span style="margin-right: 15px; color: var(--gold);">${m.totalRevenue.toLocaleString()} دج</span>
                                    </div>
                                </div>
                            `).join('')}
                            ${topMerchants.length === 0 ? '<p style="text-align: center;">لا توجد بيانات</p>' : ''}
                        </div>
                    </div>
                    
                    <!-- زر تحديث -->
                    <div style="text-align: center; margin-top: 25px;">
                        <button class="btn-gold" onclick="Analytics.refreshAndShow()">
                            <i class="fas fa-sync-alt"></i> تحديث الإحصائيات
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },
    
    // تحديث وعرض الإحصائيات
    refreshAndShow() {
        this.collectStats();
        this.showAnalyticsDashboard();
        Utils.showNotification('✅ تم تحديث الإحصائيات', 'success');
    },
    
    // تصدير الإحصائيات كملف CSV
    exportStats() {
        const data = [];
        
        // إضافة الرؤوس
        data.push(['التاريخ', 'الطلبات', 'الإيرادات', 'المنتجات']);
        
        // إضافة البيانات
        this.dailyStats.forEach(day => {
            data.push([day.date, day.orders, day.revenue, day.products]);
        });
        
        // تحويل إلى CSV
        const csv = data.map(row => row.join(',')).join('\n');
        
        // تحميل الملف
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `analytics_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        Utils.showNotification('📥 تم تصدير الإحصائيات', 'success');
    }
};

// ===== [9.2] تهيئة النظام =====
window.Analytics = AnalyticsSystem;
AnalyticsSystem.init();

console.log('✅ نظام التحليلات جاهز');
