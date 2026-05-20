// Tiny shared activity logger included by exercise pages. Each page calls
// window.logCowchActivity(name) on entry; we dedupe by name+day so the
// weekly report can say things like "you rode the wave 4 times this week"
// without double-counting if the page reloads.
(function () {
    var KEY = 'cowch-activity-v1';
    var MAX_ENTRIES = 500;

    function dayKey(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
            + '-' + String(d.getDate()).padStart(2, '0');
    }

    window.logCowchActivity = function (name, opts) {
        try {
            var arr = JSON.parse(localStorage.getItem(KEY) || '[]');
            var now = new Date();
            var today = dayKey(now);
            // Dedupe per name per day unless opts.allowDuplicates is set
            if (!opts || !opts.allowDuplicates) {
                var already = arr.some(function (e) {
                    return e && e.name === name && e.day === today;
                });
                if (already) return;
            }
            arr.push({ name: name, at: now.toISOString(), day: today });
            if (arr.length > MAX_ENTRIES) arr = arr.slice(-MAX_ENTRIES);
            localStorage.setItem(KEY, JSON.stringify(arr));
        } catch (e) { /* swallow — non-essential */ }
    };

    // Auto-log when a page sets a data attribute on <body>
    function autoLog() {
        var body = document.body;
        if (!body) return;
        var name = body.getAttribute('data-cowch-activity');
        if (name) window.logCowchActivity(name);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoLog);
    } else {
        autoLog();
    }
})();
