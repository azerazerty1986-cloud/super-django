/**
 * نظام التحليلات والإحصائيات - Analytics System 2026
 * نكهة وجمال | ناردو برو
 * 
 * يوفر نظام متكامل لتحليل البيانات والمبيعات والعملاء
 */

class AnalyticsSystem {
    constructor() {
        this.events = this.loadEvents();
        this.pageViews = this.loadPageViews();
        this.userSessions = this.loadUserSessions();
    }

    /**
     * تحميل الأحداث من التخزين المحلي
     */
    loadEvents() {
        const saved = localStorage.getItem('nardoo_analytics_events');
        return saved ? JSON.parse(saved) : [];
    }

    /**
     * تحميل مشاهدات الصفحات
     */
    loadPageViews() {
        const saved = localStorage.getItem('nardoo_page_views');
        return saved ? JSON.parse(saved) : [];
    }

    /**
     * تحميل جلسات المستخدمين
     */
    loadUserSessions() {
        const saved = localStorage.getItem('nardoo_user_sessions');
        return saved ? JSON.parse(saved) : [];
    }

    /**
     * حفظ الأحداث
     */
    saveEvents() {
        localStorage.setItem('nardoo_analytics_events', JSON.stringify(this.events));
    }

    /**
     * حفظ مشاهدات الصفحات
     */
    savePageViews() {
        localStorage.setItem('nardoo_page_views', JSON.stringify(this.pageViews));
    }

    /**
     * حفظ جلسات المستخدمين
     */
    saveUserSessions() {
        localStorage.setItem('nardoo_user_sessions', JSON.stringify(this.userSessions));
    }

    /**
     * تسجيل حدث
     * @param {string} eventType - نوع الحدث
     * @param {Object} eventData - بيانات الحدث
     */
    trackEvent(eventType, eventData = {}) {
        const event = {
            id: this.generateEventId(),
            type: eventType,
            data: eventData,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.events.push(event);
        this.saveEvents();

        // إرسال إلى خادم (اختياري)
        this.sendEventToServer(event);
    }

    /**
     * تسجيل مشاهدة صفحة
     * @param {string} pageName - اسم الصفحة
     * @param {string} pageUrl - عنوان URL
     */
    trackPageView(pageName, pageUrl = window.location.href) {
        const pageView = {
            id: this.generateEventId(),
            pageName: pageName,
            pageUrl: pageUrl,
            timestamp: new Date().toISOString(),
            referrer: document.referrer,
            userAgent: navigator.userAgent
        };

        this.pageViews.push(pageView);
        this.savePageViews();
    }

    /**
     * بدء جلسة مستخدم جديدة
     * @param {string} userId - معرّف المستخدم
     * @returns {string} معرّف الجلسة
     */
    startUserSession(userId) {
        const sessionId = this.generateSessionId();
        const session = {
            id: sessionId,
            userId: userId,
            startTime: new Date().toISOString(),
            endTime: null,
            duration: 0,
            pageViews: [],
            events: [],
            deviceInfo: this.getDeviceInfo()
        };

        this.userSessions.push(session);
        this.saveUserSessions();

        // حفظ معرّف الجلسة في sessionStorage
        sessionStorage.setItem('nardoo_session_id', sessionId);

        return sessionId;
    }

    /**
     * إنهاء جلسة مستخدم
     * @param {string} sessionId - معرّف الجلسة
     */
    endUserSession(sessionId) {
        const session = this.userSessions.find(s => s.id === sessionId);
        if (session) {
            session.endTime = new Date().toISOString();
            session.duration = new Date(session.endTime) - new Date(session.startTime);
            this.saveUserSessions();
        }
    }

    /**
     * الحصول على معلومات الجهاز
     * @returns {Object} معلومات الجهاز
     */
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cookiesEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine
        };
    }

    /**
     * توليد معرّف فريد للحدث
     * @returns {string} معرّف الحدث
     */
    generateEventId() {
        return `EVT${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
    }

    /**
     * توليد معرّف فريد للجلسة
     * @returns {string} معرّف الجلسة
     */
    generateSessionId() {
        return `SES${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
    }

    /**
     * حساب إحصائيات الزيارات
     * @returns {Object} الإحصائيات
     */
    getVisitStatistics() {
        const stats = {
            totalPageViews: this.pageViews.length,
            uniquePages: new Set(this.pageViews.map(pv => pv.pageName)).size,
            totalSessions: this.userSessions.length,
            averageSessionDuration: 0,
            topPages: {},
            referrers: {}
        };

        // حساب متوسط مدة الجلسة
        const completedSessions = this.userSessions.filter(s => s.endTime);
        if (completedSessions.length > 0) {
            const totalDuration = completedSessions.reduce((sum, s) => sum + s.duration, 0);
            stats.averageSessionDuration = Math.round(totalDuration / completedSessions.length);
        }

        // أكثر الصفحات زيارة
        this.pageViews.forEach(pv => {
            stats.topPages[pv.pageName] = (stats.topPages[pv.pageName] || 0) + 1;
        });

        // أكثر المراجع
        this.pageViews.forEach(pv => {
            if (pv.referrer) {
                stats.referrers[pv.referrer] = (stats.referrers[pv.referrer] || 0) + 1;
            }
        });

        return stats;
    }

    /**
     * حساب إحصائيات الأحداث
     * @returns {Object} الإحصائيات
     */
    getEventStatistics() {
        const stats = {
            totalEvents: this.events.length,
            eventsByType: {},
            eventsByDate: {},
            topEvents: []
        };

        this.events.forEach(event => {
            // حسب النوع
            stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;

            // حسب التاريخ
            const date = event.timestamp.split('T')[0];
            stats.eventsByDate[date] = (stats.eventsByDate[date] || 0) + 1;
        });

        // أكثر الأحداث تكراراً
        stats.topEvents = Object.entries(stats.eventsByType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        return stats;
    }

    /**
     * حساب معدل التحويل
     * @returns {number} معدل التحويل (نسبة مئوية)
     */
    getConversionRate() {
        const cartAddedEvents = this.events.filter(e => e.type === 'addToCart').length;
        const checkoutEvents = this.events.filter(e => e.type === 'checkout').length;

        if (cartAddedEvents === 0) return 0;
        return ((checkoutEvents / cartAddedEvents) * 100).toFixed(2);
    }

    /**
     * الحصول على سلوك المستخدم
     * @returns {Object} معلومات السلوك
     */
    getUserBehavior() {
        const behavior = {
            mostViewedProducts: {},
            mostSearchedTerms: {},
            abandonedCarts: 0,
            completedPurchases: 0,
            averageTimeOnPage: 0
        };

        // المنتجات الأكثر مشاهدة
        const productViews = this.events.filter(e => e.type === 'viewProduct');
        productViews.forEach(e => {
            const productId = e.data.productId;
            behavior.mostViewedProducts[productId] = (behavior.mostViewedProducts[productId] || 0) + 1;
        });

        // المصطلحات الأكثر بحثاً
        const searchEvents = this.events.filter(e => e.type === 'search');
        searchEvents.forEach(e => {
            const term = e.data.searchTerm;
            behavior.mostSearchedTerms[term] = (behavior.mostSearchedTerms[term] || 0) + 1;
        });

        // السلات المهجورة
        const cartAddedCount = this.events.filter(e => e.type === 'addToCart').length;
        const checkoutCount = this.events.filter(e => e.type === 'checkout').length;
        behavior.abandonedCarts = cartAddedCount - checkoutCount;

        // الشراءات المكتملة
        behavior.completedPurchases = this.events.filter(e => e.type === 'purchase').length;

        return behavior;
    }

    /**
     * إرسال الحدث إلى الخادم (اختياري)
     * @param {Object} event - الحدث
     */
    sendEventToServer(event) {
        // يمكن تنفيذ هذا لاحقاً للإرسال إلى خادم تحليلات
        // fetch('/api/analytics/events', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(event)
        // });
    }

    /**
     * تصدير التحليلات كـ JSON
     * @returns {string} بيانات JSON
     */
    exportAnalyticsAsJSON() {
        return JSON.stringify({
            events: this.events,
            pageViews: this.pageViews,
            userSessions: this.userSessions,
            statistics: {
                visits: this.getVisitStatistics(),
                events: this.getEventStatistics(),
                behavior: this.getUserBehavior(),
                conversionRate: this.getConversionRate()
            }
        }, null, 2);
    }

    /**
     * تنظيف البيانات القديمة (أكثر من 3 أشهر)
     */
    cleanupOldData() {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const initialEventCount = this.events.length;
        const initialPageViewCount = this.pageViews.length;
        const initialSessionCount = this.userSessions.length;

        this.events = this.events.filter(e => new Date(e.timestamp) > threeMonthsAgo);
        this.pageViews = this.pageViews.filter(pv => new Date(pv.timestamp) > threeMonthsAgo);
        this.userSessions = this.userSessions.filter(s => new Date(s.startTime) > threeMonthsAgo);

        this.saveEvents();
        this.savePageViews();
        this.saveUserSessions();

        return {
            eventsDeleted: initialEventCount - this.events.length,
            pageViewsDeleted: initialPageViewCount - this.pageViews.length,
            sessionsDeleted: initialSessionCount - this.userSessions.length
        };
    }

    /**
     * إنشاء تقرير شامل
     * @returns {Object} التقرير
     */
    generateComprehensiveReport() {
        return {
            generatedAt: new Date().toISOString(),
            visitStatistics: this.getVisitStatistics(),
            eventStatistics: this.getEventStatistics(),
            userBehavior: this.getUserBehavior(),
            conversionRate: this.getConversionRate(),
            summary: {
                totalEvents: this.events.length,
                totalPageViews: this.pageViews.length,
                totalSessions: this.userSessions.length,
                dataRetentionDays: 90
            }
        };
    }
}

// إنشاء نسخة عامة من الكائن
const analyticsManager = new AnalyticsSystem();
// تصدير للاستخدام العام
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsSystem;
}


