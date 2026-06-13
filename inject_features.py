import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# 1. CDN LIBRARIES
# ============================================================
old_cdn = '    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>'
new_cdn = '''    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>'''
content = content.replace(old_cdn, new_cdn, 1)
print('Step 1 (CDN):', 'tesseract' in content)

# ============================================================
# 2. CSS for new features
# ============================================================
css_to_inject = '''
        /* ============ AI SUGGESTIONS ============ */
        .ai-suggestion-card {
            background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05));
            border: 1px solid rgba(99,102,241,0.2);
            border-radius: 14px;
            padding: 18px 20px;
            margin-bottom: 14px;
            display: flex;
            gap: 14px;
            align-items: flex-start;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .ai-suggestion-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(99,102,241,0.12);
        }
        .ai-suggestion-icon {
            font-size: 28px;
            flex-shrink: 0;
            margin-top: 2px;
        }
        .ai-suggestion-content { flex: 1; }
        .ai-suggestion-title {
            font-weight: 700;
            font-size: 14px;
            color: var(--text-primary);
            margin-bottom: 4px;
        }
        .ai-suggestion-desc {
            font-size: 13px;
            color: var(--text-secondary);
            line-height: 1.55;
        }
        .ai-suggestion-badge {
            font-size: 11px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 20px;
            margin-top: 8px;
            display: inline-block;
        }
        .badge-save { background: rgba(16,185,129,0.15); color: #10b981; }
        .badge-warn { background: rgba(245,158,11,0.15); color: #f59e0b; }
        .badge-info { background: rgba(99,102,241,0.15); color: #818cf8; }
        .ai-header-card {
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            color: white;
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .ai-header-icon { font-size: 42px; }
        .ai-header-title { font-size: 20px; font-weight: 800; font-family: 'Outfit', sans-serif; }
        .ai-header-sub { font-size: 13px; opacity: 0.85; margin-top: 4px; }

        /* ============ GOALS ============ */
        .goal-card {
            background: var(--surface-secondary);
            border: 1px solid var(--border-color);
            border-radius: 14px;
            padding: 20px;
            margin-bottom: 14px;
            position: relative;
            transition: transform 0.2s ease;
        }
        .goal-card:hover { transform: translateY(-2px); }
        .goal-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .goal-name { font-size: 16px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
        .goal-emoji { font-size: 24px; }
        .goal-amounts { text-align: right; }
        .goal-saved { font-size: 18px; font-weight: 800; color: var(--accent-primary); }
        .goal-target { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
        .goal-progress-bar {
            height: 10px;
            background: rgba(255,255,255,0.06);
            border-radius: 999px;
            overflow: hidden;
            margin-bottom: 10px;
        }
        .goal-progress-fill {
            height: 100%;
            border-radius: 999px;
            background: linear-gradient(90deg, #4f46e5, #7c3aed);
            transition: width 0.8s ease;
        }
        .goal-progress-fill.complete { background: linear-gradient(90deg, #10b981, #059669); }
        .goal-meta { display: flex; justify-content: space-between; align-items: center; }
        .goal-pct { font-size: 13px; font-weight: 700; color: var(--accent-primary); }
        .goal-deadline { font-size: 12px; color: var(--text-secondary); }
        .goal-actions { display: flex; gap: 8px; }
        .goal-btn { background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px; border-radius: 6px; transition: background 0.15s; }
        .goal-btn:hover { background: rgba(255,255,255,0.08); }
        .add-goal-form {
            background: var(--surface-secondary);
            border: 1px dashed var(--border-color);
            border-radius: 14px;
            padding: 20px;
            margin-top: 16px;
        }
        .goal-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        @media (max-width: 600px) { .goal-form-grid { grid-template-columns: 1fr; } }

        /* ============ RECEIPT SCANNER MODAL ============ */
        .receipt-modal {
            position: fixed; inset: 0; z-index: 1000;
            background: rgba(0,0,0,0.7);
            display: flex; align-items: center; justify-content: center;
            padding: 20px;
            opacity: 0; pointer-events: none;
            transition: opacity 0.2s ease;
        }
        .receipt-modal.open { opacity: 1; pointer-events: all; }
        .receipt-modal-content {
            background: var(--surface-primary);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 28px;
            width: 100%; max-width: 500px;
            max-height: 90vh; overflow-y: auto;
        }
        .receipt-drop-zone {
            border: 2px dashed rgba(99,102,241,0.4);
            border-radius: 14px;
            padding: 40px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
            background: rgba(99,102,241,0.03);
            margin-bottom: 16px;
        }
        .receipt-drop-zone:hover { border-color: var(--accent-primary); background: rgba(99,102,241,0.07); }
        .receipt-drop-zone .drop-icon { font-size: 48px; margin-bottom: 12px; }
        .receipt-drop-zone p { color: var(--text-secondary); font-size: 14px; }
        .ocr-result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
        .ocr-field label { font-size: 12px; color: var(--text-secondary); font-weight: 600; display: block; margin-bottom: 4px; }
        .ocr-field input { width: 100%; padding: 8px 12px; background: #1e293b; border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-size: 13px; }
        .ocr-loading { text-align: center; padding: 20px; }
        .ocr-spinner { display: inline-block; width: 36px; height: 36px; border: 3px solid rgba(99,102,241,0.2); border-top-color: var(--accent-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .preview-img { width: 100%; border-radius: 10px; margin-bottom: 14px; max-height: 200px; object-fit: contain; }
'''
# Inject before closing </style> tag
content = content.replace('    </style>\n', css_to_inject + '    </style>\n', 1)
print('Step 2 (CSS):', 'ai-suggestion-card' in content)

# ============================================================
# 3. SIDEBAR NAV: Add AI + Goals links before Settings
# ============================================================
old_sidebar_settings = '''                        <a class="menu-link" onclick="showScreen('settings')">'''
new_sidebar_items = '''                        <a class="menu-link" onclick="showScreen('aiSuggestions')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 2a10 10 0 1 0 10 10"/>
                                <path d="M12 8v4l3 3"/>
                                <circle cx="18" cy="6" r="3" fill="currentColor" stroke="none" opacity="0.4"/>
                                <path d="M17 5l1 1 2-2" stroke-width="1.5"/>
                            </svg>
                            <span>AI Advisor</span>
                        </a>
                    </li>
                    <li>
                        <a class="menu-link" onclick="showScreen('goals')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <circle cx="12" cy="12" r="6"/>
                                <circle cx="12" cy="12" r="2"/>
                            </svg>
                            <span>Goals</span>
                        </a>
                    </li>
                    <li>
                        <a class="menu-link" onclick="showScreen('settings')">'''
content = content.replace(old_sidebar_settings, new_sidebar_items, 1)
print('Step 3 (Sidebar):', 'AI Advisor' in content)

# ============================================================
# 4. BOTTOM NAV: Replace Settings with AI + Goals, keep 5 items
# ============================================================
old_bottom_settings = '''                <a class="bottom-nav-link" onclick="showScreen('settings')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span>Settings</span>
                </a>'''
new_bottom_nav = '''                <a class="bottom-nav-link" onclick="showScreen('aiSuggestions')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2a10 10 0 1 0 10 10"/>
                        <path d="M12 8v4l3 3"/>
                        <circle cx="18" cy="6" r="3"/>
                    </svg>
                    <span>AI</span>
                </a>
                <a class="bottom-nav-link" onclick="showScreen('goals')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <circle cx="12" cy="12" r="6"/>
                        <circle cx="12" cy="12" r="2"/>
                    </svg>
                    <span>Goals</span>
                </a>'''
content = content.replace(old_bottom_settings, new_bottom_nav, 1)
print('Step 4 (Bottom Nav):', 'AI</span>' in content)

# ============================================================
# 5. SCREENS: AI Suggestions + Goals screens
# ============================================================
ai_goals_screens = '''
                    <!-- AI SUGGESTIONS SCREEN -->
                    <div id="aiSuggestions" class="screen">
                        <div class="ai-header-card">
                            <div class="ai-header-icon">🤖</div>
                            <div>
                                <div class="ai-header-title">AI Financial Advisor</div>
                                <div class="ai-header-sub">Personalized savings tips based on your spending patterns</div>
                            </div>
                        </div>
                        <div id="aiSuggestionsList">
                            <div class="loading"><div class="spinner"></div>Analyzing your spending...</div>
                        </div>
                    </div>

                    <!-- GOALS SCREEN -->
                    <div id="goals" class="screen">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                            <div>
                                <h2 style="font-family:'Outfit',sans-serif; font-size:22px; font-weight:800;">🎯 Savings Goals</h2>
                                <p style="font-size:13px; color:var(--text-secondary); margin-top:4px;">Track your financial goals and stay motivated</p>
                            </div>
                            <button class="btn btn-primary" onclick="toggleAddGoalForm()" id="addGoalBtn">+ Add Goal</button>
                        </div>

                        <!-- Add Goal Form -->
                        <div class="add-goal-form" id="addGoalForm" style="display:none; margin-bottom:20px;">
                            <h4 style="font-size:14px; font-weight:700; margin-bottom:14px;">New Savings Goal</h4>
                            <div class="goal-form-grid">
                                <div class="form-group" style="margin:0">
                                    <label class="form-label">Goal Name</label>
                                    <input type="text" id="goalName" class="form-input" placeholder="e.g. New Phone" style="margin-top:4px;">
                                </div>
                                <div class="form-group" style="margin:0">
                                    <label class="form-label">Emoji Icon</label>
                                    <input type="text" id="goalEmoji" class="form-input" placeholder="📱" style="margin-top:4px;" maxlength="2">
                                </div>
                                <div class="form-group" style="margin:0">
                                    <label class="form-label">Target Amount (₹)</label>
                                    <input type="number" id="goalTarget" class="form-input" placeholder="30000" style="margin-top:4px;">
                                </div>
                                <div class="form-group" style="margin:0">
                                    <label class="form-label">Already Saved (₹)</label>
                                    <input type="number" id="goalSaved" class="form-input" placeholder="0" style="margin-top:4px;">
                                </div>
                                <div class="form-group" style="margin:0">
                                    <label class="form-label">Target Date</label>
                                    <input type="date" id="goalDeadline" class="form-input" style="margin-top:4px;">
                                </div>
                            </div>
                            <div style="display:flex; gap:10px;">
                                <button class="btn btn-primary" onclick="saveNewGoal()">💾 Save Goal</button>
                                <button class="btn btn-secondary" onclick="toggleAddGoalForm()">Cancel</button>
                            </div>
                        </div>

                        <div id="goalsList">
                            <div class="loading"><div class="spinner"></div>Loading goals...</div>
                        </div>
                    </div>

'''
# Insert screens before </div>\n            </main>
old_main_end = '                </div>\n            </main>'
content = content.replace(old_main_end, ai_goals_screens + '                </div>\n            </main>', 1)
print('Step 5 (Screens):', 'aiSuggestions' in content)

# ============================================================
# 6. RECEIPT SCANNER MODAL + SCAN BUTTON in transaction form
# ============================================================
receipt_modal = '''
        <!-- RECEIPT SCANNER MODAL -->
        <div id="receiptModal" class="receipt-modal">
            <div class="receipt-modal-content">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <div>
                        <h3 style="font-size:18px; font-weight:800; font-family:'Outfit',sans-serif;">📷 Receipt Scanner</h3>
                        <p style="font-size:12px; color:var(--text-secondary); margin-top:3px;">AI-powered OCR extracts details automatically</p>
                    </div>
                    <button onclick="closeReceiptModal()" style="background:rgba(255,255,255,0.06); border:none; color:var(--text-primary); width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:16px;">✕</button>
                </div>

                <div class="receipt-drop-zone" id="receiptDropZone" onclick="document.getElementById('receiptFileInput').click()">
                    <div class="drop-icon">📄</div>
                    <p><strong>Click to upload</strong> a receipt photo</p>
                    <p style="margin-top:4px; font-size:12px; opacity:0.7;">JPG, PNG, PDF supported</p>
                </div>
                <input type="file" id="receiptFileInput" accept="image/*" style="display:none" onchange="processReceipt(this)">

                <img id="receiptPreview" class="preview-img" style="display:none;">

                <div id="ocrLoading" class="ocr-loading" style="display:none;">
                    <div class="ocr-spinner"></div>
                    <p style="margin-top:12px; color:var(--text-secondary); font-size:13px;">Scanning receipt with AI OCR...</p>
                    <p id="ocrProgress" style="font-size:11px; color:var(--accent-primary); margin-top:4px;"></p>
                </div>

                <div id="ocrResults" style="display:none;">
                    <h4 style="font-size:13px; font-weight:700; margin-bottom:10px; color:var(--text-primary);">✅ Extracted Details — verify and edit:</h4>
                    <div class="ocr-result-grid">
                        <div class="ocr-field" style="grid-column:1/-1">
                            <label>Merchant / Description</label>
                            <input type="text" id="ocrMerchant" placeholder="e.g. Swiggy Order">
                        </div>
                        <div class="ocr-field">
                            <label>Amount (₹)</label>
                            <input type="number" id="ocrAmount" placeholder="0.00">
                        </div>
                        <div class="ocr-field">
                            <label>Date</label>
                            <input type="date" id="ocrDate">
                        </div>
                        <div class="ocr-field" style="grid-column:1/-1">
                            <label>Category</label>
                            <select id="ocrCategory" style="width:100%; padding:8px 12px; background:#1e293b; border:1px solid var(--border-color); border-radius:8px; color:var(--text-primary); font-size:13px;">
                                <option>Food &amp; Dining</option>
                                <option>Transport</option>
                                <option>Entertainment</option>
                                <option>Utilities</option>
                                <option>Healthcare</option>
                                <option>Shopping</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>
                    <button class="btn btn-primary" style="width:100%;" onclick="useOcrData()">✅ Use These Details</button>
                </div>
            </div>
        </div>

'''
# Insert receipt modal after FAB
old_fab = '        <!-- ADD TRANSACTION MODAL -->'
content = content.replace(old_fab, receipt_modal + '        <!-- ADD TRANSACTION MODAL -->', 1)
print('Step 6 (Receipt Modal):', 'receiptModal' in content)

# ============================================================
# 7. SCAN RECEIPT button inside the New Transaction form
# ============================================================
old_modal_header = '                    <span>New Transaction</span>'
new_modal_header = '''                    <span>New Transaction</span>
                    <button type="button" onclick="openReceiptModal()" style="background:linear-gradient(135deg,#4f46e5,#7c3aed); border:none; color:white; padding:6px 14px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px;">
                        📷 Scan Receipt
                    </button>'''
content = content.replace(old_modal_header, new_modal_header, 1)
print('Step 7 (Scan Button):', 'Scan Receipt' in content)

# ============================================================
# 8. PDF REPORT button in the Digest screen
# ============================================================
old_email_btn = '                                <button class="btn btn-primary" onclick="emailWeeklyDigest()" id="btnEmailDigest">📧 Email Digest to Me</button>'
new_email_btn = '''                                <button class="btn btn-primary" onclick="emailWeeklyDigest()" id="btnEmailDigest">📧 Email Digest to Me</button>
                                <button class="btn btn-secondary" onclick="generateMonthlyPDF()" id="btnPdfReport">📄 Download PDF Report</button>'''
content = content.replace(old_email_btn, new_email_btn, 1)
print('Step 8 (PDF Button):', 'generateMonthlyPDF' in content)

# ============================================================
# 9. INJECT JAVASCRIPT for all features before closing </script>
# ============================================================
js_to_inject = '''
        // ============ AI SAVING SUGGESTIONS ============
        function updateAISuggestions(transactions) {
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

            const thisMonth = {}, lastMonth = {};
            let thisTotal = 0, lastTotal = 0;

            transactions.forEach(tx => {
                if (tx.type !== 'expense') return;
                const d = tx.date?.toDate?.() || new Date(tx.date);
                const amt = tx.amount || 0;
                const cat = tx.category || 'Other';
                if (d >= thisMonthStart) {
                    thisMonth[cat] = (thisMonth[cat] || 0) + amt;
                    thisTotal += amt;
                } else if (d >= lastMonthStart && d < thisMonthStart) {
                    lastMonth[cat] = (lastMonth[cat] || 0) + amt;
                    lastTotal += amt;
                }
            });

            const fmt = n => `₹${Number(n||0).toLocaleString('en-IN')}`;
            const suggestions = [];

            // 1. Month-over-month total
            if (lastTotal > 0) {
                const pct = ((thisTotal - lastTotal) / lastTotal * 100).toFixed(0);
                if (pct > 0) {
                    suggestions.push({
                        icon: '📈',
                        title: `Overall Spending Up ${pct}%`,
                        desc: `Your total expenses this month (${fmt(thisTotal)}) are ${pct}% higher than last month (${fmt(lastTotal)}). Try to identify and cut discretionary spending.`,
                        badge: 'warn', badgeText: 'Action Needed'
                    });
                } else {
                    suggestions.push({
                        icon: '🎉',
                        title: `Great! Spending Down ${Math.abs(pct)}%`,
                        desc: `You spent ${fmt(thisTotal)} this month vs ${fmt(lastTotal)} last month. You saved ${fmt(lastTotal - thisTotal)} more this month!`,
                        badge: 'save', badgeText: `Saved ${fmt(lastTotal - thisTotal)}`
                    });
                }
            }

            // 2. Category spikes
            const allCats = new Set([...Object.keys(thisMonth), ...Object.keys(lastMonth)]);
            allCats.forEach(cat => {
                const cur = thisMonth[cat] || 0;
                const prev = lastMonth[cat] || 0;
                if (prev > 0 && cur > prev * 1.25) {
                    const spike = ((cur - prev) / prev * 100).toFixed(0);
                    const potential = cur - prev;
                    suggestions.push({
                        icon: getCategoryIcon(cat),
                        title: `${cat} expenses increased by ${spike}%`,
                        desc: `You spent ${fmt(cur)} on ${cat} this month vs ${fmt(prev)} last month. Reducing ${cat} spending to last month's level could save you ${fmt(potential)}.`,
                        badge: 'warn', badgeText: `Potential saving: ${fmt(potential)}`
                    });
                }
            });

            // 3. Top spending category advice
            const sortedCats = Object.entries(thisMonth).sort((a,b) => b[1]-a[1]);
            if (sortedCats.length > 0) {
                const [topCat, topAmt] = sortedCats[0];
                const share = (topAmt / thisTotal * 100).toFixed(0);
                if (share > 40) {
                    const savings10 = (topAmt * 0.1).toFixed(0);
                    suggestions.push({
                        icon: '💡',
                        title: `${topCat} = ${share}% of your budget`,
                        desc: `${topCat} is dominating your expenses at ${fmt(topAmt)} (${share}% of total). Even cutting 10% from this category could save you ${fmt(savings10)} per month.`,
                        badge: 'info', badgeText: `10% cut = ${fmt(savings10)}/month`
                    });
                }
            }

            // 4. Budget utilization
            if (thisTotal > 0 && BUDGET_LIMIT > 0) {
                const remaining = BUDGET_LIMIT - thisTotal;
                const daysLeft = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate() - now.getDate();
                const dailyRemaining = remaining / (daysLeft || 1);
                if (remaining > 0) {
                    suggestions.push({
                        icon: '🏦',
                        title: `Budget on track — ${fmt(remaining)} remaining`,
                        desc: `You have ${fmt(remaining)} left in your ${fmt(BUDGET_LIMIT)} monthly budget. That's ${fmt(Math.round(dailyRemaining))} per day for the remaining ${daysLeft} days.`,
                        badge: 'save', badgeText: `${daysLeft} days remaining`
                    });
                }
            }

            // 5. Savings tip
            if (thisTotal > 10000) {
                const tip3 = (thisTotal * 0.03).toFixed(0);
                suggestions.push({
                    icon: '🪙',
                    title: '50/30/20 Savings Rule',
                    desc: `Financial advisors recommend saving 20% of income. With your current spending of ${fmt(thisTotal)}, even saving 3% more (${fmt(tip3)}) builds a strong emergency fund over time.`,
                    badge: 'info', badgeText: 'Pro Tip'
                });
            }

            if (suggestions.length === 0) {
                suggestions.push({
                    icon: '📊',
                    title: 'Add more transactions to unlock AI insights',
                    desc: 'Track at least 2 months of expenses to see personalized spending analysis, category comparisons, and saving recommendations.',
                    badge: 'info', badgeText: 'Getting Started'
                });
            }

            const html = suggestions.map(s => `
                <div class="ai-suggestion-card">
                    <div class="ai-suggestion-icon">${s.icon}</div>
                    <div class="ai-suggestion-content">
                        <div class="ai-suggestion-title">${s.title}</div>
                        <div class="ai-suggestion-desc">${s.desc}</div>
                        <span class="ai-suggestion-badge badge-${s.badge}">${s.badgeText}</span>
                    </div>
                </div>
            `).join('');

            const el = document.getElementById('aiSuggestionsList');
            if (el) el.innerHTML = html;
        }

        function getCategoryIcon(cat) {
            const icons = { 'Food & Dining':'🍔', 'Transport':'🚗', 'Entertainment':'🎬', 'Utilities':'💡', 'Healthcare':'🏥', 'Shopping':'🛍️', 'Salary':'💼', 'Other':'📦' };
            return icons[cat] || '📌';
        }

        // ============ GOAL-BASED SAVINGS ============
        let userGoals = [];

        async function loadGoals() {
            try {
                const { collection: col, query: q, onSnapshot: snap, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
                const goalsRef = col(db, 'users', currentUser.uid, 'goals');
                const snapshot = await getDocs(goalsRef);
                userGoals = [];
                snapshot.forEach(d => userGoals.push({ id: d.id, ...d.data() }));
                renderGoals();
            } catch(e) { console.error('Error loading goals:', e); }
        }

        async function saveNewGoal() {
            const name = document.getElementById('goalName').value.trim();
            const emoji = document.getElementById('goalEmoji').value.trim() || '🎯';
            const target = parseFloat(document.getElementById('goalTarget').value);
            const saved = parseFloat(document.getElementById('goalSaved').value) || 0;
            const deadline = document.getElementById('goalDeadline').value;

            if (!name || !target || target < 1) { showToast('⚠️ Please enter a goal name and target amount', 'warning'); return; }

            try {
                const { collection: col, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
                await addDoc(col(db, 'users', currentUser.uid, 'goals'), { name, emoji, targetAmount: target, savedAmount: saved, deadline: deadline || '', createdAt: new Date() });
                showToast('🎯 Goal saved!', 'success');
                ['goalName','goalEmoji','goalTarget','goalSaved','goalDeadline'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
                toggleAddGoalForm();
                await loadGoals();
            } catch(e) { showToast('❌ Error saving goal', 'error'); }
        }
        window.saveNewGoal = saveNewGoal;

        async function addToGoal(goalId, currentSaved) {
            const amt = parseFloat(prompt('How much have you saved towards this goal? (enter total saved amount)') || '0');
            if (!amt || amt < 0) return;
            try {
                const { doc: docRef, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
                await updateDoc(docRef(db, 'users', currentUser.uid, 'goals', goalId), { savedAmount: amt });
                showToast('✅ Progress updated!', 'success');
                await loadGoals();
            } catch(e) { showToast('❌ Error updating goal', 'error'); }
        }
        window.addToGoal = addToGoal;

        async function deleteGoal(goalId) {
            if (!confirm('Delete this goal?')) return;
            try {
                const { doc: docRef, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
                await deleteDoc(docRef(db, 'users', currentUser.uid, 'goals', goalId));
                showToast('🗑️ Goal deleted', 'info');
                await loadGoals();
            } catch(e) { showToast('❌ Error deleting goal', 'error'); }
        }
        window.deleteGoal = deleteGoal;

        function renderGoals() {
            const el = document.getElementById('goalsList');
            if (!el) return;
            if (userGoals.length === 0) {
                el.innerHTML = `<div style="text-align:center; padding:60px 20px; color:var(--text-secondary);">
                    <div style="font-size:56px; margin-bottom:16px;">🎯</div>
                    <p style="font-size:16px; font-weight:600; margin-bottom:8px;">No goals yet</p>
                    <p style="font-size:13px;">Click "+ Add Goal" to start tracking your savings goals</p>
                </div>`;
                return;
            }
            el.innerHTML = userGoals.map(g => {
                const pct = Math.min(((g.savedAmount || 0) / g.targetAmount) * 100, 100).toFixed(0);
                const complete = pct >= 100;
                const fmt = n => `₹${Number(n||0).toLocaleString('en-IN')}`;
                const deadline = g.deadline ? new Date(g.deadline).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : 'No deadline';
                return `
                <div class="goal-card">
                    <div class="goal-top">
                        <div class="goal-name"><span class="goal-emoji">${g.emoji||'🎯'}</span>${g.name}</div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div class="goal-amounts">
                                <div class="goal-saved">${fmt(g.savedAmount || 0)}</div>
                                <div class="goal-target">of ${fmt(g.targetAmount)}</div>
                            </div>
                            <div class="goal-actions">
                                <button class="goal-btn" onclick="addToGoal('${g.id}', ${g.savedAmount||0})" title="Update saved amount">✏️</button>
                                <button class="goal-btn" onclick="deleteGoal('${g.id}')" title="Delete goal">🗑️</button>
                            </div>
                        </div>
                    </div>
                    <div class="goal-progress-bar">
                        <div class="goal-progress-fill ${complete?'complete':''}" style="width:${pct}%"></div>
                    </div>
                    <div class="goal-meta">
                        <span class="goal-pct">${complete?'✅ Goal Achieved!':pct+'% complete'}</span>
                        <span class="goal-deadline">🗓 ${deadline}</span>
                    </div>
                </div>`;
            }).join('');
        }

        function toggleAddGoalForm() {
            const f = document.getElementById('addGoalForm');
            if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
            document.getElementById('goalDeadline').min = new Date().toISOString().split('T')[0];
        }
        window.toggleAddGoalForm = toggleAddGoalForm;

        // ============ RECEIPT SCANNER (OCR) ============
        function openReceiptModal() {
            document.getElementById('receiptModal').classList.add('open');
            document.getElementById('ocrResults').style.display = 'none';
            document.getElementById('ocrLoading').style.display = 'none';
            document.getElementById('receiptPreview').style.display = 'none';
            document.getElementById('receiptDropZone').style.display = 'block';
        }
        window.openReceiptModal = openReceiptModal;

        function closeReceiptModal() {
            document.getElementById('receiptModal').classList.remove('open');
        }
        window.closeReceiptModal = closeReceiptModal;

        async function processReceipt(input) {
            if (!input.files || !input.files[0]) return;
            const file = input.files[0];
            const url = URL.createObjectURL(file);

            const preview = document.getElementById('receiptPreview');
            preview.src = url;
            preview.style.display = 'block';
            document.getElementById('receiptDropZone').style.display = 'none';
            document.getElementById('ocrLoading').style.display = 'block';
            document.getElementById('ocrResults').style.display = 'none';

            try {
                const worker = await Tesseract.createWorker('eng', 1, {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            document.getElementById('ocrProgress').textContent = `Progress: ${(m.progress * 100).toFixed(0)}%`;
                        }
                    }
                });
                const result = await worker.recognize(file);
                const text = result.data.text;
                await worker.terminate();

                // Parse amount
                const amtMatch = text.match(/(?:total|amount|amt|grand total|rs\.?|inr|₹)\s*:?\s*(\d[\d,]*\.?\d*)/i)
                    || text.match(/₹\s*(\d[\d,]*\.?\d*)/i)
                    || text.match(/(\d[\d,]+\.\d{2})/);
                const amount = amtMatch ? amtMatch[1].replace(/,/g,'') : '';

                // Parse date
                const dateMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
                let dateStr = '';
                if (dateMatch) {
                    const [, d, m, y] = dateMatch;
                    const yr = y.length === 2 ? '20'+y : y;
                    dateStr = `${yr}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
                }

                // Parse merchant - usually first non-empty line
                const lines = text.split('\\n').map(l => l.trim()).filter(l => l.length > 2 && !/^[\d\s\.\,\-\/]+$/.test(l));
                const merchant = lines[0] || 'Purchase';

                // Guess category
                const textL = text.toLowerCase();
                let cat = 'Other';
                if (/swiggy|zomato|restaurant|cafe|food|pizza|burger|dining/.test(textL)) cat = 'Food & Dining';
                else if (/uber|ola|taxi|petrol|fuel|parking/.test(textL)) cat = 'Transport';
                else if (/amazon|flipkart|mall|store|shop/.test(textL)) cat = 'Shopping';
                else if (/hospital|pharmacy|medical|clinic|doctor/.test(textL)) cat = 'Healthcare';
                else if (/electricity|water|bill|broadband|internet/.test(textL)) cat = 'Utilities';
                else if (/cinema|movie|netflix|prime/.test(textL)) cat = 'Entertainment';

                document.getElementById('ocrLoading').style.display = 'none';
                document.getElementById('ocrResults').style.display = 'block';
                document.getElementById('ocrMerchant').value = merchant;
                document.getElementById('ocrAmount').value = amount;
                document.getElementById('ocrDate').value = dateStr || new Date().toISOString().split('T')[0];
                document.getElementById('ocrCategory').value = cat;
            } catch(err) {
                document.getElementById('ocrLoading').style.display = 'none';
                showToast('❌ Could not read receipt. Try a clearer image.', 'error');
            }
        }
        window.processReceipt = processReceipt;

        function useOcrData() {
            const merchant = document.getElementById('ocrMerchant').value;
            const amount = document.getElementById('ocrAmount').value;
            const date = document.getElementById('ocrDate').value;
            const cat = document.getElementById('ocrCategory').value;

            closeReceiptModal();
            openAddModal();

            document.getElementById('txType').value = 'expense';
            syncPaymentMethodField();
            document.getElementById('txDescription').value = merchant;
            document.getElementById('txAmount').value = amount;
            document.getElementById('txDate').value = date;
            document.getElementById('txCategory').value = cat;

            showToast('✅ Receipt data filled! Review and submit.', 'success');
        }
        window.useOcrData = useOcrData;

        // ============ MONTHLY PDF REPORT ============
        async function generateMonthlyPDF() {
            const btn = document.getElementById('btnPdfReport');
            if (btn) { btn.textContent = '⏳ Generating...'; btn.disabled = true; }

            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

                const now = new Date();
                const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

                const txs = allTransactions.filter(tx => {
                    const d = tx.date?.toDate?.() || new Date(tx.date);
                    return d >= monthStart;
                });

                let income = 0, expenses = 0;
                const catBreak = {};
                txs.forEach(tx => {
                    if (tx.type === 'income') income += tx.amount;
                    else { expenses += tx.amount; catBreak[tx.category] = (catBreak[tx.category]||0) + tx.amount; }
                });
                const savings = income - expenses;
                const fmt = n => 'Rs.' + Number(n||0).toLocaleString('en-IN');

                // Header
                doc.setFillColor(79, 70, 229);
                doc.rect(0, 0, 210, 40, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(22);
                doc.setFont('helvetica', 'bold');
                doc.text('ExpenseCloud', 14, 18);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                doc.text(`Monthly Financial Report — ${monthName}`, 14, 28);
                doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 35);

                // Summary cards
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('Financial Summary', 14, 55);

                const cardData = [
                    ['Total Income', fmt(income), [16, 185, 129]],
                    ['Total Expenses', fmt(expenses), [239, 68, 68]],
                    ['Net Savings', fmt(Math.abs(savings)), savings >= 0 ? [79, 70, 229] : [245, 158, 11]]
                ];

                cardData.forEach(([label, val, color], i) => {
                    const x = 14 + i * 62;
                    doc.setFillColor(...color.map(c => c));
                    doc.roundedRect(x, 60, 56, 28, 3, 3, 'F');
                    doc.setTextColor(255,255,255);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.text(label, x+4, 70);
                    doc.setFontSize(13);
                    doc.setFont('helvetica', 'bold');
                    doc.text(val, x+4, 80);
                });

                // Category breakdown table
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('Spending by Category', 14, 105);

                const catRows = Object.entries(catBreak)
                    .sort((a,b) => b[1]-a[1])
                    .map(([cat, amt]) => [cat, fmt(amt), ((amt/expenses)*100).toFixed(1)+'%']);

                doc.autoTable({
                    startY: 110,
                    head: [['Category', 'Amount', '% of Expenses']],
                    body: catRows.length ? catRows : [['No expenses this month', '-', '-']],
                    styles: { fontSize: 10, cellPadding: 4 },
                    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    margin: { left: 14, right: 14 }
                });

                // Transaction list
                const finalY = doc.lastAutoTable.finalY + 12;
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 41, 59);
                doc.text('Recent Transactions', 14, finalY);

                const txRows = txs.slice(0, 20).map(tx => {
                    const d = tx.date?.toDate?.() || new Date(tx.date);
                    return [
                        d.toLocaleDateString('en-IN'),
                        tx.description || '-',
                        tx.category || '-',
                        tx.type === 'income' ? '+'+fmt(tx.amount) : '-'+fmt(tx.amount)
                    ];
                });

                doc.autoTable({
                    startY: finalY + 5,
                    head: [['Date', 'Description', 'Category', 'Amount']],
                    body: txRows.length ? txRows : [['No transactions this month','-','-','-']],
                    styles: { fontSize: 9, cellPadding: 3 },
                    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    margin: { left: 14, right: 14 }
                });

                // Footer
                const pageCount = doc.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setTextColor(148, 163, 184);
                    doc.text(`ExpenseCloud — Page ${i} of ${pageCount}`, 14, 290);
                    doc.text('Generated automatically by ExpenseCloud', 105, 290, { align: 'center' });
                }

                doc.save(`ExpenseCloud_Report_${now.getFullYear()}_${String(now.getMonth()+1).padStart(2,'0')}.pdf`);
                showToast('✅ PDF Report downloaded!', 'success');
            } catch(e) {
                console.error(e);
                showToast('❌ Error generating PDF: ' + e.message, 'error');
            } finally {
                if (btn) { btn.textContent = '📄 Download PDF Report'; btn.disabled = false; }
            }
        }
        window.generateMonthlyPDF = generateMonthlyPDF;

'''

# Find the closing of the script module tag
# Insert JS before the last closing </script> tag inside the module
old_close = '    </script>\n</body>'
content = content.replace(old_close, js_to_inject + '    </script>\n</body>', 1)
print('Step 9 (JS):', 'updateAISuggestions' in content)

# ============================================================
# 10. Wire up AI + Goals into listenToTransactions
# ============================================================
old_wire = '                updatePaymentModesScreen(transactions);\n            }, (error) => {'
new_wire = '''                updatePaymentModesScreen(transactions);
                updateAISuggestions(transactions);
            }, (error) => {'''
content = content.replace(old_wire, new_wire, 1)
print('Step 10 (Wire AI):', 'updateAISuggestions(transactions)' in content)

# ============================================================
# 11. Wire up Goals in loadApp
# ============================================================
old_loadapp = '            updateNotificationBtn();\n        }'
new_loadapp = '''            updateNotificationBtn();
            await loadGoals();
        }'''
content = content.replace(old_loadapp, new_loadapp, 1)
print('Step 11 (Wire Goals):', 'await loadGoals()' in content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('\\nAll done! Total lines:', len(content.splitlines()))
