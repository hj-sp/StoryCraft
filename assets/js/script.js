window.emitter = window.emitter || { emit() {}, on() {}, off() {} };

var isLocal =
    typeof isLocal !== 'undefined'
        ? isLocal
        : location.hostname === 'localhost' ||
          location.hostname === '127.0.0.1';
var BASE_URL =
    typeof BASE_URL !== 'undefined'
        ? BASE_URL
        : isLocal
        ? 'http://127.0.0.1:8000'
        : 'https://storycraft-ppxj.onrender.com';
// : 'https://storycraft-ppxj.onrender.com';

/* === [INLINE SPINNER UTILS | put this just after BASE_URL, before DOMContentLoaded] === */

document.addEventListener(
    'pointerdown',
    (e) => {
        const btn = e.target.closest('[data-panel-btn]');
        if (!btn) return;
        if (window.__forceFullOnce) return;
        window.SelectionStore?.save?.();
        if (window.quill) {
            const r = window.quill.getSelection(true);
            if (r && r.length > 0) window.__chatSelStable = r;
            if (r) window.__lastQuillRange = r;
        }
        e.preventDefault();
    },
    true
);

// [B] 패널 내부는 저장만 — 클릭 막지 않음
document.addEventListener(
    'pointerdown',
    (e) => {
        const drawer = document.getElementById('scDrawer');
        if (!drawer || !drawer.contains(e.target)) return;

        if (
            e.target.closest('.sc-scope-controls') ||
            e.target.closest('[data-skip-prevent="1"]')
        ) {
            return;
        }

        if (window.__forceFullOnce) return;

        // 패널 내부 다른 인터랙션은 선택만 저장
        const interactive = e.target.closest(
            'textarea, input, button, [contenteditable], .sc-btn-send'
        );
        if (!interactive) return;

        if (window.quill) {
            const r = window.quill.getSelection(true);
            if (r && r.length > 0) window.__chatSelStable = r;
            if (r) window.__lastQuillRange = r;
        }
        window.SelectionStore?.save?.();
    },
    true
);

const RESULT_IDS = {
    prompt: 'scChatList', // 대화창 메시지 리스트(필요 시)
    summary: 'smResult',
    expand: 'exResult',
    rewrite: 'rwResult',
    grammar: 'grResult',
    translate: 'trResult',
    style: 'stResult',
    honorific: 'hnResult',
    informal: 'ifmResult',
};

async function runWithPanelSpinner(label, taskFn, areaEl) {
    const area =
        areaEl ||
        getActiveResultBox?.() ||
        document.getElementById('resultArea');
    if (!area) return taskFn();
    createInlineSpinner(area, label);
    try {
        return await taskFn();
    } finally {
        removeInlineSpinner(area);
    }
}

// 현재 열린 패널의 결과 컨테이너를 찾아 반환
function getActiveResultBox() {
    const body = document.getElementById('scDrawerBody');
    if (!body) return null;

    // OPEN_KEY는 아래 openPanel에서 갱신됨
    const key =
        (typeof OPEN_KEY !== 'undefined' && OPEN_KEY) ||
        document.getElementById('scDrawer')?.dataset.key ||
        'summary';

    const id = RESULT_IDS[key];
    let el = id ? body.querySelector('#' + id) : null;

    // (폴백) 기능별 결과 박스가 없으면 공용 앵커를 보장
    if (!el) {
        el = body.querySelector('#resultArea');
        if (!el) {
            el = document.createElement('div');
            el.id = 'resultArea';
            body.appendChild(el);
        }
    }
    return el;
}

function ensureResultContainer() {
    // 패널 본문
    const body = document.getElementById('scDrawerBody');
    if (!body) return null;

    // 이미 있으면 재사용
    let box = body.querySelector('#resultArea');
    if (box) return box;

    // 없으면 생성 + 붙이기
    box = document.createElement('div');
    box.id = 'resultArea';
    // 필요하면 기본 패딩/여백
    // box.style.padding = '8px 0';
    body.appendChild(box);
    return box;
}

function createInlineSpinner(container, label = '처리 중…') {
    if (!container) return null;
    let box = container.querySelector('[data-role="inline-spinner"]');
    if (!box) {
        box = document.createElement('div');
        box.className = 'sc-inline-loading';
        box.setAttribute('data-role', 'inline-spinner');

        const spin = document.createElement('span');
        spin.className = 'spinner'; // main.css의 기존 스피너 클래스 재사용

        const text = document.createElement('span');
        text.className = 'sc-inline-loading__label';
        text.textContent = label;

        box.appendChild(spin);
        box.appendChild(text);
        container.appendChild(box);
    } else {
        const text = box.querySelector('.sc-inline-loading__label');
        if (text) text.textContent = label;
        box.style.display = 'inline-flex';
    }
    return box;
}

function removeInlineSpinner(container) {
    if (!container) return;
    const box = container.querySelector('[data-role="inline-spinner"]');
    if (box) box.remove();
}

async function runWithPanelSpinner(label, taskFn) {
    const area =
        typeof getActiveResultBox === 'function'
            ? getActiveResultBox()
            : document.getElementById('resultArea');
    if (!area) {
        // 패널이 아직 안 열렸다면 그냥 실행
        return taskFn();
    }
    createInlineSpinner(area, label);
    try {
        return await taskFn();
    } finally {
        removeInlineSpinner(area);
    }
}

function getPanelTipText(key) {
    const map = {
        prompt: 'AI 프롬프트 입력 패널이에요.\n텍스트를 입력하면 선택 영역 또는 문서 전체에 적용됩니다.',
        summary:
            '문서를 간결하게 요약해줍니다.\n문단 또는 불릿 형식으로 출력됩니다.',
        expand: '짧은 글을 더 풍부하게 확장합니다.\n문단이나 문장을 자연스럽게 늘려줍니다.',
        rewrite: '문맥을 유지하면서 문장을 더 매끄럽게 다시 써줍니다.',
        grammar:
            '맞춤법과 문법을 교정합니다.\n띄어쓰기와 조사 오류도 함께 수정돼요.',
        style: '글의 문체(공손체, 간결체 등)를 바꿉니다.',
        honorific: '문장을 높임말(합니다/해요체)로 바꿔줍니다.',
        informal: '문장을 반말체(해라/한다체)로 바꿔줍니다.',
        translate: '선택한 언어로 번역해줍니다.',
        speech: '음성으로 입력할 수 있습니다. 녹음/정지/삽입 버튼입니다.',
    };
    return map[key] || '이 기능에 대한 설명이 없습니다.';
}

// ===== 프롬프트 스코프 컨트롤 강제 마운트 유틸 =====
function ensurePromptScopeControls() {
    const drawer = document.getElementById('scDrawer');
    if (!drawer) return false;

    const scope = drawer.querySelector('#scChatScope'); // TPL.prompt 안의 라벨
    if (!scope) return false;

    // 이미 있으면 재사용
    let box = scope.nextElementSibling;
    if (
        !(box && box.classList && box.classList.contains('sc-scope-controls'))
    ) {
        box = document.createElement('div');
        box.className = 'sc-scope-controls';
        box.style.display = 'inline-flex';
        box.style.gap = '8px';
        box.style.marginLeft = '8px';
        box.style.verticalAlign = 'middle';
        box.innerHTML = `
      <button type="button" class="sc-btn sc-btn--ghost sc-btn--xs" data-role="show-sel"  data-skip-prevent="1">선택 부분 재확인</button>
      <button type="button" class="sc-btn sc-btn--ghost sc-btn--xs" data-role="clear-sel" data-skip-prevent="1">선택 해제</button>
    `;
        scope.insertAdjacentElement('afterend', box);
    }

    const btnShow = box.querySelector('[data-role="show-sel"]');
    const btnClear = box.querySelector('[data-role="clear-sel"]');

    // 중복 바인딩 방지
    if (!btnShow.dataset.bound) {
        btnShow.dataset.bound = '1';
        btnShow.addEventListener('click', (evt) => {
            evt.preventDefault();
            evt.stopPropagation();
            const q = window.quill;
            const r =
                window.__chatSelStable ||
                window.__lastQuillRange ||
                (q && q.getSelection && q.getSelection());
            if (!q || !r || !Number.isFinite(r.index) || r.length <= 0) return;

            requestAnimationFrame(() => {
                try {
                    q.focus();
                } catch {}
                requestAnimationFrame(() => {
                    try {
                        q.setSelection(r.index, r.length); // 하이라이트 표시
                        btnClear.focus(); // 바로 다음 클릭 가능하게 버튼으로 포커스 복귀
                    } catch {}
                });
            });
        });
    }

    if (!btnClear.dataset.bound) {
        btnClear.dataset.bound = '1';
        btnClear.addEventListener('click', (evt) => {
            evt.preventDefault();
            evt.stopPropagation();

            window.__lastQuillRange = null;
            window.__forceFullOnce = true; // 다음 1회 전체 적용

            window.__scopeClearEpoch = (window.__scopeClearEpoch || 0) + 1;

            window.__scopeMode = 'fullOnce';
            window.__chatSelStable = null;

            const q = window.quill;
            if (q) {
                // 현재 selection이 있으면 그 시작 위치, 없으면 0에 커서 고정
                let caretIndex = 0;
                try {
                    const live = q.getSelection(); // null일 수 있음
                    caretIndex = live ? live.index : 0;
                } catch {}
                try {
                    q.setSelection(caretIndex, 0, 'silent'); // ✅ 하이라이트 제거
                } catch {}

                // 3) "최근 범위"도 0-길이로 덮어써서 복구 경로 차단
                window.__lastQuillRange = { index: caretIndex, length: 0 };
            } else {
                window.__lastQuillRange = { index: 0, length: 0 };
            }

            // 라벨 갱신 함수가 있으면 호출
            try {
                const drawer = document.getElementById('scDrawer');
                const scopeEl = drawer?.querySelector('#scChatScope');
                if (scopeEl && q) {
                    const len = Math.max(0, q.getLength() - 1);
                    scopeEl.textContent = `텍스트: 선택 없음 → 전체 문서(${len.toLocaleString()}자)`;
                }
            } catch {}
            requestAnimationFrame(() => {
                try {
                    window.quill?.focus();
                } catch {}
            });
        });
    }

    return true;
}
function restoreSelectionIfAny() {
    if (window.__forceFullOnce) return; // 전체 1회 강제면 복구 금지
    const snap = window.__chatSelStable;
    if (!snap || !window.quill) return;
    try {
        window.quill.setSelection(
            snap.index,
            Math.max(snap.length || 0, 0),
            'silent'
        );
    } catch {}
}

function placeArrowCenter() {
    const inputWrap = document.querySelector('.page-inputResult .input-wrap');
    const arrow = document.querySelector('.page-inputResult .page-arrow');
    if (!inputWrap || !arrow) return;

    const inputH = inputWrap.clientHeight;
    const arrowH = arrow.clientHeight || 28;
    const mt = Math.max(0, (inputH - arrowH) / 2);
    arrow.style.marginTop = `${mt}px`;
}

/* === [/INLINE SPINNER UTILS] === */

// DOMContentLoaded 이벤트를 사용하여 DOM이 완전히 로드된 이후에 document.getElementById로 요소를 찾도록 수정
document.addEventListener('DOMContentLoaded', () => {
    placeArrowCenter();
    window.addEventListener('resize', placeArrowCenter);

    const input = document.querySelector(
        '.page-inputResult .input-wrap textarea'
    );

    if (input) {
        input.addEventListener('input', placeArrowCenter);
    }

    const resultArea = document.querySelector('.page-inputResult');
    if (resultArea) {
        const ro = new ResizeObserver(placeArrowCenter);
        ro.observe(resultArea);
    }

    // 버튼 클릭 이벤트 바인딩
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            searchExample();
        });
    }
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadMoreExamples();
        });
    }
    const rewriteBtn = document.getElementById('rewriteBtn');
    if (rewriteBtn) {
        rewriteBtn.addEventListener('click', mistralRewrite);
    }
    const summaryBtn = document.getElementById('summaryBtn');
    if (summaryBtn) {
        summaryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            summarizeText();
        });
    }
    const expandBtn = document.getElementById('expandBtn');
    if (expandBtn) {
        expandBtn.addEventListener('click', (e) => {
            e.preventDefault();
            expandText();
        });
    }
    const styleBtn = document.getElementById('styleBtn');
    if (styleBtn) {
        styleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            applyStyle();
        });
    }
    const grammarBtn = document.getElementById('grammarBtn');
    if (grammarBtn) {
        grammarBtn.addEventListener('click', mistralGrammar);
    }
    const honorificBtn = document.getElementById('honorificBtn');
    if (honorificBtn) {
        honorificBtn.addEventListener('click', (e) => {
            e.preventDefault();
            cohereHonorific();
        });
    }
    const informalBtn = document.getElementById('informalBtn');
    if (informalBtn) {
        informalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            cohereInformal();
        });
    }
    const pdfScanStyleBtn = document.getElementById('pdfScanStyleBtn');
    if (pdfScanStyleBtn) {
        pdfScanStyleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            pdfScanStyle();
        });
    }
    const pdfScanRewriteBtn = document.getElementById('pdfScanRewriteBtn');
    if (pdfScanRewriteBtn) {
        pdfScanRewriteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            pdfScanRewrite();
        });
    }
    const pdfScanSummaryBtn = document.getElementById('pdfScanSummaryBtn');
    if (pdfScanSummaryBtn) {
        pdfScanSummaryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            pdfScanSummary();
        });
    }
    const pdfScanExpandBtn = document.getElementById('pdfScanExpandBtn');
    if (pdfScanExpandBtn) {
        pdfScanExpandBtn.addEventListener('click', (e) => {
            e.preventDefault();
            pdfScanExpand();
        });
    }
    const pdfScanGrammarBtn = document.getElementById('pdfScanGrammarBtn');
    if (pdfScanGrammarBtn) {
        pdfScanGrammarBtn.addEventListener('click', (e) => {
            e.preventDefault();
            pdfScanGrammar();
        });
    }
    const pdfScanHonorificBtn = document.getElementById('pdfScanHonorificBtn');
    if (pdfScanHonorificBtn) {
        pdfScanHonorificBtn.addEventListener('click', (e) => {
            e.preventDefault();
            pdfScanHonorific();
        });
    }
    const pdfScanInformalBtn = document.getElementById('pdfScanInformalBtn');
    if (pdfScanInformalBtn) {
        pdfScanInformalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            pdfScanInformal();
        });
    }
    const pdfScanTranslateBtn = document.getElementById('pdfScanTranslateBtn');
    if (pdfScanTranslateBtn) {
        pdfScanTranslateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            pdfScanTranslate();
        });
    }
    const speechStyleBtn = document.getElementById('speechStyleBtn');
    if (speechStyleBtn) {
        speechStyleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            speechStyle(lastRecordedFile);
        });
    }
    const speechRewriteBtn = document.getElementById('speechRewriteBtn');
    if (speechRewriteBtn) {
        speechRewriteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            speechRewrite(lastRecordedFile);
        });
    }
    const speechSummaryBtn = document.getElementById('speechSummaryBtn');
    if (speechSummaryBtn) {
        speechSummaryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (lastRecordedFile) {
                speechSummary(lastRecordedFile); // 🔹 녹음 파일 전달
            } else {
                speechSummary(); // 🔹 업로드 input에서 가져오기
            }
        });
    }
    const speechExpandBtn = document.getElementById('speechExpandBtn');
    if (speechExpandBtn) {
        speechExpandBtn.addEventListener('click', (e) => {
            e.preventDefault();
            speechExpand(lastRecordedFile);
        });
    }
    const speechHonorificBtn = document.getElementById('speechHonorificBtn');
    if (speechHonorificBtn) {
        speechHonorificBtn.addEventListener('click', (e) => {
            e.preventDefault();
            speechHonorific(lastRecordedFile);
        });
    }
    const speechInformalBtn = document.getElementById('speechInformalBtn');
    if (speechInformalBtn) {
        speechInformalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            speechInformal(lastRecordedFile);
        });
    }
    const speechTranslateBtn = document.getElementById('speechTranslateBtn');
    if (speechTranslateBtn) {
        speechTranslateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            speechTranslate(lastRecordedFile);
        });
    }
    const startRecord = document.getElementById('startRecord');
    if (startRecord) {
        startRecord.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('startRecord 있음');
            startRecording();
        });
    }
    const stopRecord = document.getElementById('stopRecord');
    if (stopRecord) {
        stopRecord.addEventListener('click', (e) => {
            e.preventDefault();
            stopRecording();
        });
    }
    const btnrewrite = document.getElementById('btn-rewrite');
    if (btnrewrite) {
        btnrewrite.addEventListener('click', (e) => {
            e.preventDefault();
            doRewrite();
        });
    }
    const btnsummary = document.getElementById('btn-summary');
    if (btnsummary) {
        btnsummary.addEventListener('click', (e) => {
            e.preventDefault();
            runWithPanelSpinner('요약 생성 중…', () => doSummary());
        });
    }
    const btnexpand = document.getElementById('btn-expand');
    if (btnexpand) {
        btnexpand.addEventListener('click', (e) => {
            e.preventDefault();
            runWithPanelSpinner('확장 생성 중…', () => doExpand());
        });
    }
    const btnstyle = document.getElementById('btn-style');
    if (btnstyle) {
        btnstyle.addEventListener('click', (e) => {
            e.preventDefault();
            doStyle();
        });
    }
    const btnhonorific = document.getElementById('btn-honorific');
    if (btnhonorific) {
        btnhonorific.addEventListener('click', (e) => {
            e.preventDefault();
            doHonorific();
        });
    }
    const btninformal = document.getElementById('btn-informal');
    if (btninformal) {
        btninformal.addEventListener('click', (e) => {
            e.preventDefault();
            doInformal();
        });
    }
    const btntranslate = document.getElementById('btn-translate');
    if (btntranslate) {
        btntranslate.addEventListener('click', (e) => {
            e.preventDefault();
            doTranslate();
        });
    }
    const btngrammar = document.getElementById('btn-grammar');
    if (btngrammar) {
        btngrammar.addEventListener('click', (e) => {
            e.preventDefault();
            runWithPanelSpinner('문법 분석 중…', () => doGrammar());
        });
    }
    const editorPdfDownloadBtn = document.getElementById(
        'editorPdfDownloadBtn'
    );
    if (editorPdfDownloadBtn) {
        editorPdfDownloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            editorPdfDownload();
        });
    }
    const editorStartRecord = document.getElementById('editorStartRecord');
    if (editorStartRecord) {
        editorStartRecord.addEventListener('click', (e) => {
            e.preventDefault();
            editorStartRecording();
        });
    }
    const editorStopRecord = document.getElementById('editorStopRecord');
    if (editorStopRecord) {
        editorStopRecord.addEventListener('click', (e) => {
            e.preventDefault();
            editorStopRecording();
        });
    }
    const editorInsertRecord = document.getElementById('editorInsertRecord');
    if (editorInsertRecord) {
        editorInsertRecord.addEventListener('click', (e) => {
            e.preventDefault();
            editorInsertRecording();
        });
    }
    const btnpromptchange = document.getElementById('btn-prompt-change');
    if (btnpromptchange) {
        btnpromptchange.addEventListener('click', (e) => {
            e.preventDefault();
            sendPromptChange();
        });
    }
    const btnOcr = document.getElementById('btn-ocr');
    if (btnOcr) {
        btnOcr.addEventListener('click', (e) => {
            e.preventDefault();
            doOCRorFile();
        });
    }
    const imagepromptchange = document.getElementById('image-prompt-change');
    if (imagepromptchange) {
        imagepromptchange.addEventListener('click', (e) => {
            e.preventDefault();
            imagePromptChange();
        });
    }

    ['btn-prompt-change', 'promptIcon', 'openPromptPanelBtn'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('mousedown', (e) => {
            SelectionStore.save?.();
            e.preventDefault();
        });
        el.addEventListener('click', () =>
            setTimeout(() => SelectionStore.restore?.(), 0)
        );
    });

    // 모든 패널 버튼 클릭 시 선택 영역 유지
    const panelBtnIds = [
        'rewriteBtn',
        'grammarBtn',
        'summaryBtn',
        'expandBtn',
        'styleBtn',
        'honorificBtn',
        'informalBtn',
        'translateBtn',
    ];

    panelBtnIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('mousedown', (e) => {
            if (window.SelectionStore?.save) {
                window.SelectionStore.save();
            }
            e.preventDefault(); // 클릭 직전에 selection 유지
        });

        el.addEventListener('click', () => {
            setTimeout(() => {
                if (window.SelectionStore?.restore) {
                    window.SelectionStore.restore();
                }
            }, 0);
        });
    });
});

// (선택) 스피너 유틸
function spin(on) {
    const ov = document.getElementById('edit_spinner');
    if (ov) {
        ov.setAttribute('aria-hidden', String(!on));
        document.documentElement.classList.toggle('is-edit-loading', !!on);
    }
}

async function searchExample() {
    const userInput = document.getElementById('userInput').value.trim();

    if (!userInput) {
        alert('입력된 문장이 없습니다.');
        return;
    }

    exampleOffset = 0;
    loadMoreExamples();
}

let exampleOffset = 0;
let currentInput = '';
let lastExtractedText = '';

async function loadMoreExamples() {
    const userInput = document.getElementById('userInput').value.trim();
    const container = document.getElementById('exampleContainer');

    spin(true); // ✅ 로딩 시작

    if (!userInput) {
        spin(false); // ✅ 에러 시 로딩 해제
        alert('입력된 문장이 없습니다.');
        return;
    }

    if (exampleOffset === 0) {
        currentInput = userInput; // 첫 요청 시 저장
        container.innerHTML = ''; // 초기화
    }

    try {
        const response = await fetch(`${BASE_URL}/searchExample`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: currentInput,
                offset: exampleOffset,
            }),
        });

        const data = await response.json();

        if (data.result) {
            const examples = data.result
                .split(/\d+\.\s+/)
                .filter((e) => e.trim());
            examples.forEach((ex, i) => {
                const div = document.createElement('div');
                div.style.textAlign = 'left';
                div.style.marginBottom = '10px';

                const span = document.createElement('span');
                span.innerText = `${exampleOffset + i + 1}. ${ex.trim()} `;

                const copyBtn = document.createElement('button');
                copyBtn.innerText = '📋';
                copyBtn.title = '예문 복사';
                copyBtn.style.border = 'none';
                copyBtn.style.background = 'transparent';
                copyBtn.style.cursor = 'pointer';
                copyBtn.style.fontSize = '16px';
                copyBtn.style.padding = '0';
                copyBtn.style.margin = '0';
                copyBtn.style.display = 'inline';

                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(ex.trim());
                    copyBtn.innerText = '✅';
                    setTimeout(() => (copyBtn.innerText = '📋'), 1000);
                };

                span.appendChild(copyBtn);
                div.appendChild(span);
                container.appendChild(div);
            });

            exampleOffset += examples.length;

            const moreBtn = document.getElementById('loadMoreBtn');
            if (moreBtn) {
                moreBtn.style.display = 'inline-block';
            }

            const pdfBtn = document.getElementById('pdfDownloadBtn');
            if (pdfBtn) {
                pdfBtn.addEventListener('click', () => {
                    const container =
                        document.getElementById('exampleContainer');
                    if (!container) {
                        console.error(
                            '❌ exampleContainer 요소를 찾을 수 없습니다.'
                        );
                        return;
                    }

                    // 📋 이모티콘 제거 (innerText를 안전하게 처리)
                    const content = (container.innerText || '')
                        .replace(/📋/g, '') // 이모티콘 제거
                        .trim();

                    // saveAsPDF 함수가 존재하는지 확인
                    if (typeof saveAsPDF === 'function') {
                        saveAsPDF(content, '예문 제공.pdf');
                    } else {
                        console.error(
                            '❌ saveAsPDF 함수가 정의되지 않았습니다.'
                        );
                    }
                });
            }
        } else {
            container.innerText = '예문을 불러오지 못했습니다.';
        }
    } catch (error) {
        console.error('예문 요청 오류:', error);
        alert('❗ 예문 불러오기 중 오류 발생');
    } finally {
        spin(false); // ✅ 로딩 종료
    }
}
function rebindRewriteBtn() {
    const currentBtn = document.getElementById('rewriteBtn');
    if (!currentBtn) return;

    const newBtn = currentBtn.cloneNode(true);
    newBtn.id = 'rewriteBtn';
    currentBtn.replaceWith(newBtn);
    newBtn.addEventListener('click', mistralRewrite);
}

async function mistralRewrite() {
    const userInput = document.getElementById('userInput').value;
    const originalText = userInput;

    const outerArea = document.getElementById('resultArea');
    spin(true);

    if (!userInput.trim()) {
        alert('입력된 문장이 없습니다.');
        spin(false);
        return;
    }

    outerArea.innerHTML = '';

    const resultArea = document.createElement('div');
    outerArea.appendChild(resultArea);

    resultArea.innerHTML = '';

    try {
        const response = await fetch(`${BASE_URL}/mistralRewrite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: userInput }),
        });

        const data = await response.json();

        console.log('📥 서버 응답:', data.result);

        if (!data.result || data.result.trim() === '') {
            resultArea.innerHTML =
                '<p style="color: red;">❗ 결과가 비어 있습니다.</p>';
            spin(false);
            return;
        }

        const examples = data.result
            .split(/예시문(?: \d+)?:/)
            .map((text) => text.trim())
            .filter((text) => text.length > 0);

        const first = examples[0] || '결과 없음';

        try {
            resultArea.innerHTML = highlightDiffWithType(originalText, first);
        } catch (e) {
            resultArea.innerText = first;
            console.warn('highlightDiff 실패, 기본 출력 사용:', e);
        }

        // PDF 버튼 이벤트
        const pdfBtn = document.getElementById('pdfDownloadBtn');
        if (pdfBtn) {
            const newBtn = pdfBtn.cloneNode(true);
            newBtn.id = 'pdfDownloadBtn';
            pdfBtn.replaceWith(newBtn);
            newBtn.addEventListener(
                'click',
                () => saveAsPDF(resultArea, '재작성.pdf') // wrapper → resultArea
            );
        }

        rebindRewriteBtn();
    } catch (error) {
        console.error('Fetch error:', error);
        resultArea.innerHTML =
            '<p style="color: red;">❗ 요청 중 오류가 발생했습니다.</p>';
    } finally {
        spin(false);
    }
}

async function changeStyle(exampleId) {
    const selectedText = document.getElementById(exampleId).innerText.trim();
    const styleRaw = document.getElementById(`${exampleId}-style`).value;
    const style = styleRaw.toLowerCase();
    spin(true);

    console.log('🛠 스타일 적용 요청:', { selectedText, style });

    if (!selectedText) {
        alert('선택된 예시문이 비어있습니다.');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/gptStyleChange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: selectedText, style: style }),
        });

        const data = await response.json();
        if (data.styled_text) {
            document.getElementById(exampleId).innerText = data.styled_text;
            document
                .getElementById('pdfDownloadBtn')
                .addEventListener('click', function () {
                    saveAsPDF(data.styled_text, '문체 변경.pdf');
                });
        } else {
            alert('스타일 변환 실패: ' + (data.error || '알 수 없는 오류'));
        }
    } catch (error) {
        console.error('스타일 변경 중 오류:', error);
        alert('❗스타일 변경 요청 중 오류가 발생했습니다.');
    } finally {
        spin(false);
    }
}

async function applyStyle() {
    const text = document.getElementById('styleInput').value;
    const style = document.getElementById('styleSelector').value;
    const result = document.getElementById('styleResult');
    spin(true);

    result.innerText = '';

    if (!text.trim()) {
        spin(false);
        alert('문장을 입력해주세요.');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/gptStyleChange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, style }),
        });
        const data = await response.json();

        result.innerText =
            data.styled_text || data.error || '오류가 발생했습니다.';

        const pdfBtn = document.getElementById('pdfDownloadBtn');
        if (pdfBtn) {
            pdfBtn.onclick = function () {
                saveAsPDF(data.styled_text, '문체 변경.pdf');
            };
        }
    } catch (error) {
        result.innerText = '❗요청 중 오류 발생';
        console.error(error);
    } finally {
        spin(false);
    }
}

async function summarizeText() {
    const userInput = document.getElementById('userInput').value.trim();
    const resultArea = document.getElementById('resultArea');
    if (!resultArea) return;
    spin(true);

    if (!userInput) {
        spin(false);
        alert('입력된 문장이 없습니다.');
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: userInput }),
        });
        const data = await res.json();

        // 원문 결과
        const text = (data?.result || '').trim();

        // ⚠️ 에이전트가 에코하는 "요약 모드: ..." 라벨 제거(불릿/볼드 변형 포함)
        const cleanText = text
            .replace(
                /^\s*(?:[-*•]\s*)?(?:\*{1,3})?\s*요약\s*모드\s*:\s*[^\n]*\n+/i,
                ''
            )
            .trim();

        // 결과영역 초기화 후 재작성과 동일하게 내부 래퍼 div 생성
        resultArea.innerHTML = '';
        const box = document.createElement('div');
        resultArea.appendChild(box);
        box.innerHTML = `<p style="white-space: pre-wrap;">${cleanText}</p>`;

        // 우측 패널 상단 정렬 강제(컨테이너가 flex여도 위로 붙게)
        const pane =
            resultArea.closest('.result-wrap') || resultArea.parentElement;
        if (pane) {
            pane.style.alignItems = 'flex-start';
            pane.style.justifyContent = 'flex-start';
            // 필요 시 주석 해제: pane.style.display = 'block';
        }
        resultArea.scrollTop = 0;

        // PDF 저장 버튼(있을 때만) 안전 재바인딩
        const pdfBtn = document.getElementById('pdfDownloadBtn');
        if (pdfBtn) {
            const newBtn = pdfBtn.cloneNode(true);
            newBtn.id = 'pdfDownloadBtn';
            pdfBtn.replaceWith(newBtn);
            newBtn.addEventListener('click', () =>
                saveAsPDF(resultArea, '요약.pdf')
            );
        }
    } catch (e) {
        console.error(e);
        resultArea.innerHTML = '<p>❗요약 요청 중 오류가 발생했습니다.</p>';
    } finally {
        spin(false);
    }
}

async function expandText() {
    const userInput = document.getElementById('userInput').value;
    const resultArea = document.getElementById('resultArea');
    if (!resultArea) return;
    spin(true);

    if (!userInput.trim()) {
        spin(false);
        alert('입력된 문장이 없습니다.');
        return;
    }

    let expanded = '';

    try {
        const response = await fetch(`${BASE_URL}/expand`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: userInput }),
        });

        const data = await response.json();
        expanded = (data?.result || '').trim();

        // 결과 영역 초기화 후 표시 (기존 동작 유지)
        resultArea.innerHTML = '';
        const box = document.createElement('div');
        resultArea.appendChild(box);
        box.innerHTML = `<p style="white-space: pre-wrap;">${expanded}</p>`;

        // 패널 정렬 보정
        const pane = resultArea.closest('.result-wrap') || resultArea.parentElement;
        if (pane) {
            pane.style.alignItems = 'flex-start';
            pane.style.justifyContent = 'flex-start';
        }
        resultArea.scrollTop = 0;

        // PDF 저장 버튼 재바인딩 (있을 때만)
        const pdfBtn = document.getElementById('pdfDownloadBtn');
        if (pdfBtn) {
            const newBtn = pdfBtn.cloneNode(true);
            newBtn.id = 'pdfDownloadBtn';
            pdfBtn.replaceWith(newBtn);
            newBtn.addEventListener('click', () => saveAsPDF(resultArea, '확장.pdf'));
        }

    } catch (error) {
        console.error('확장 요청 중 오류:', error);
        resultArea.innerHTML = '<p>❗확장 요청 중 오류가 발생했습니다.</p>';
    }

    // ✅ 확장 결과를 에디터(Quill)에 실제 적용
    try {
        const q = window.quill;
        if (q && expanded) {
            // 선택 복원 우선순위: 이전 저장 선택 → 마지막 범위 → 현재 라이브 선택
            const snap =
                window.__chatSelStable ||
                window.__lastQuillRange ||
                q.getSelection(true);

            // 선택 영역이 있고, "전체 1회 강제 적용" 플래그가 없으면 선택 덮어쓰기
            if (snap && Number.isFinite(snap.index) && snap.length > 0 && !window.__forceFullOnce) {
                q.deleteText(snap.index, snap.length, 'user');
                q.insertText(snap.index, expanded, 'user');
                // 커서는 삽입 끝으로
                try { q.setSelection(snap.index + expanded.length, 0, 'silent'); } catch {}
            } else {
                
                q.setText(expanded);
                try { q.setSelection(Math.max(0, q.getLength() - 1), 0, 'silent'); } catch {}
            }

            
            window.__forceFullOnce = false;
        }
    } catch (err) {
        console.warn('확장 결과 에디터 적용 실패:', err);
    } finally {
        spin(false);
    }
}


async function mistralGrammar() {
    spin(true);
    const userInput = document.getElementById('userInput').value;
    if (!userInput.trim()) {
        spin(false);
        alert('입력된 문장이 없습니다.');
        return;
    }
    const grammarTable = document.getElementById('grammarTable');
    const tbody = grammarTable ? grammarTable.querySelector('tbody') : null;
    if (!tbody) {
        console.log('⚠️ tbody 요소가 없습니다. HTML 구조를 확인하세요.');
        spin(false);
        return;
    }

    const tableBody = document.querySelector('#grammarTable tbody');
    tableBody.innerHTML = '';

    try {
        const response = await fetch(`${BASE_URL}/mistralGrammar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: userInput }),
        });

        const data = await response.json();
        const raw = (data?.result ?? '').toString();
        if (!raw) {
            resultArea.innerText =
                '⚠️ Mistral AI 오류로 응답 반환이 없습니다. 다시 실행해 주세요.';
            return;
        }
        const text = data.result;

        // ---로 구분된 블록 단위로 나누기
        const blocks = text
            .split(/---+/)
            .map((block) => block.trim())
            .filter(Boolean);

        for (const block of blocks) {
            const wrong = (block.match(/❌(.*)/) || [])[1]?.trim() || '';
            const correct = (block.match(/✅(.*)/) || [])[1]?.trim() || '';
            const ruleLines = [...block.matchAll(/📖(.*)/g)].map((m) =>
                m[1].trim()
            );
            const explanation =
                (block.match(/✍️([\s\S]*)/) || [])[1]?.trim() || '';

            // 수정할 부분 없을 때만 종료
            if (
                ruleLines.length === 0 &&
                !explanation.trim() &&
                !wrong &&
                !correct
            ) {
                alert('문법 교정할 부분이 없습니다.');
                spin(false);
                return;
            }

            tag_delete = textDiff(wrong, correct);
            del_tag_delete = tag_delete.replace(/<del[^>]*>.*?<\/del>/g, '');
            ins_tag_delete = tag_delete.replace(/<ins[^>]*>.*?<\/ins>/g, '');

            const td1 = document.createElement('td');
            td1.innerHTML = `❌${ins_tag_delete}<br>✅${del_tag_delete}`;

            const style = document.createElement('style');
            style.innerHTML = `
                    del {
                        text-decoration: line-through;
                        background: #ff9999 !important
                    }
                    ins {
                        background: #81ff81 !important
                    }
                `;
            document.head.appendChild(style);

            const td2 = document.createElement('td');
            td2.innerHTML =
                ruleLines.map((r) => `📖${r}`).join('<br>') +
                `<br>✍️${explanation}`;

            const tr = document.createElement('tr');
            tr.appendChild(td1);
            tr.appendChild(td2);
            tableBody.appendChild(tr);

            // 교정문 복사 버튼
            const copyBtn = document.createElement('button');
            copyBtn.innerText = '📋';
            copyBtn.title = '교정문 복사';
            copyBtn.style.border = 'none';
            copyBtn.style.background = 'transparent';
            copyBtn.style.cursor = 'pointer';
            copyBtn.style.fontSize = '16px';
            copyBtn.style.padding = '0';
            copyBtn.style.margin = '0';
            copyBtn.style.display = 'inline'; // 핵심: 인라인으로 붙이기

            copyBtn.onclick = () => {
                navigator.clipboard.writeText(correct.trim());
                copyBtn.innerText = '✅';
                setTimeout(() => (copyBtn.innerText = '📋'), 1000);
            };
            td1.appendChild(copyBtn);

            const resultArea = document.getElementById('resultArea');
            const pdfBtn = document.getElementById('pdfDownloadBtn');
            if (pdfBtn) {
                pdfBtn.onclick = function () {
                    if (!resultArea) return;

                    // 📋 이모티콘 제거: HTML 문자열에서 제거
                    const cloned = resultArea.cloneNode(true); // 원본 손상 방지
                    cloned.querySelectorAll('*').forEach((el) => {
                        if (el.childNodes.length) {
                            el.childNodes.forEach((node) => {
                                if (node.nodeType === Node.TEXT_NODE) {
                                    node.textContent = node.textContent.replace(
                                        /📋/g,
                                        ''
                                    );
                                }
                            });
                        }
                    });

                    // HTML 그대로 PDF로 저장
                    saveAsPDF(cloned.innerHTML, '문법 교정.pdf');
                };
            }
        }
    } catch (err) {
        console.error('표 데이터 로드 실패:', err);
    } finally {
        spin(false);
    }
}

function textDiff(text1, text2) {
    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(text1, text2);
    const diffs_pretty = dmp.diff_prettyHtml(diffs);

    return diffs_pretty;
}

async function cohereHonorific() {
    const userInput = document.getElementById('userInput').value;
    const resultArea = document.getElementById('resultArea');
    resultArea.innerHTML = ''; // HTML 내용을 지움
    spin(true);

    if (!userInput.trim()) {
        spin(false);
        resultArea.innerText = '입력된 문장이 없습니다.';
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/cohereHonorific`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: userInput }),
        });

        const data = await response.json();

        if (data.result) {
            resultArea.innerText = data.result;
            const pdfBtn = document.getElementById('pdfDownloadBtn');
            if (pdfBtn) {
                pdfBtn.onclick = function () {
                    saveAsPDF(data.result, '경어체.pdf');
                };
            }
        } else if (data.error) {
            resultArea.innerText = `⚠️ 오류: ${data.error}\n\n🔍 상세 내용: ${
                data.detail || '없음'
            }`;
            console.error('에러 응답 내용:', data);
        } else {
            resultArea.innerText = '⚠️ 알 수 없는 오류가 발생했습니다.';
            console.warn('예상치 못한 응답 구조:', data);
        }
    } catch (error) {
        resultArea.innerText = '❗요청 중 오류가 발생했습니다.' + error;
        console.log('Fetch error:', error);
    } finally {
        spin(false);
    }
}

async function cohereInformal() {
    const userInput = document.getElementById('userInput').value;
    const resultArea = document.getElementById('resultArea');
    spin(true);
    resultArea.innerHTML = ''; // HTML 내용을 지움

    if (!userInput.trim()) {
        resultArea.innerText = '입력된 문장이 없습니다.';
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/cohereInformal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: userInput }),
        });

        const data = await response.json();

        if (data.result) {
            resultArea.innerText = data.result;
            const pdfBtn = document.getElementById('pdfDownloadBtn');
            if (pdfBtn) {
                pdfBtn.onclick = function () {
                    saveAsPDF(data.result, '평어체.pdf');
                };
            }
        } else if (data.error) {
            resultArea.innerText = `⚠️ 오류: ${data.error}\n\n🔍 상세 내용: ${
                data.detail || '없음'
            }`;
            console.error('에러 응답 내용:', data);
        } else {
            resultArea.innerText = '⚠️ 알 수 없는 오류가 발생했습니다.';
            console.warn('예상치 못한 응답 구조:', data);
        }
    } catch (error) {
        resultArea.innerText = '❗요청 중 오류가 발생했습니다.' + error;
        console.log('Fetch error:', error);
    } finally {
        spin(false);
    }
}

async function applyTranslation() {
    const text = document.getElementById('translateInput').value.trim();
    const sourceLang = document.getElementById('sourceSelector').value;
    const targetLang = document.getElementById('targetSelector').value;
    const resultBox = document.getElementById('translateResult');
    resultBox.innerText = '';
    spin(true);

    if (!text) {
        spin(false);
        alert('번역할 문장을 입력해주세요.');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                source: sourceLang,
                target: targetLang,
            }),
        });

        const data = await response.json();

        if (data.result) {
            resultBox.innerText = data.result;
            const pdfBtn = document.getElementById('pdfDownloadBtn');
            if (pdfBtn) {
                pdfBtn.onclick = function () {
                    saveAsPDF(data.result, '번역.pdf');
                };
            }
        } else if (data.error) {
            resultBox.innerText = `⚠️ 번역 오류: ${data.error}\n상세: ${
                data.detail || '없음'
            }`;
            console.error('Papago 오류 응답:', data);
        } else {
            resultBox.innerText = '⚠️ 알 수 없는 오류가 발생했습니다.';
            console.warn('예상치 못한 응답 구조:', data);
        }
    } catch (err) {
        console.error('번역 요청 중 오류:', err);
        resultBox.innerText = '❗ 번역 중 오류가 발생했습니다.';
    } finally {
        spin(false);
    }
}

window.getSelectedFile = function () {
    const any = document.getElementById('fileAny');
    if (any && any.files && any.files[0]) return any.files[0];

    const img = document.getElementById('imageFile');
    if (img && img.files && img.files[0]) return img.files[0];

    const pdf = document.getElementById('pdfFile');
    if (pdf && pdf.files && pdf.files[0]) return pdf.files[0];

    return null;
};

window.isImageFile = function (file) {
    if (!file) return false;
    const mime = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    return (
        mime.startsWith('image/') ||
        /\.(png|jpe?g|gif|bmp|webp|tiff?)$/.test(name)
    );
};

window.extractTextFromAnyFile = async function (file) {
    if (!file) throw new Error('파일이 없습니다.');
    const fd = new FormData();
    fd.append('file', file); // 서버 /fileScan은 'file' 필드로 받음
    const res = await fetch(`${BASE_URL}/fileScan`, {
        method: 'POST',
        body: fd,
    });
    if (!res.ok) {
        const raw = await res.text().catch(() => '');
        throw new Error(`fileScan HTTP ${res.status} - ${raw || ''}`);
    }
    const js = await res.json();
    return (js.text || '').toString();
};

// 업로더에서 파일 하나만 꺼내오기 (image.html/scan.html 겸용)
function getSelectedFile() {
    const any = document.getElementById('fileAny');
    if (any && any.files && any.files[0]) return any.files[0];

    // 예전 id 호환 (혹시 남아있다면)
    const img = document.getElementById('imageFile');
    if (img && img.files && img.files[0]) return img.files[0];

    const pdf = document.getElementById('pdfFile');
    if (pdf && pdf.files && pdf.files[0]) return pdf.files[0];

    return null;
}

// 이미지 파일 여부 판별
function isImageFile(file) {
    return /^image\//.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name);
}

async function handlePdfScanAndProcess({
    apiEndpoint,
    boxClass,
    resultKey = 'result',
    extraPayload = {},
}) {
    const resultArea =
        document.getElementById('resultArea') ||
        document.getElementById('ocrResult');
    const file = getSelectedFile();
    if (file) {
        if (isImageFile(file)) {
            const fd = new FormData();
            fd.append('image', file); // /visionOCR는 'image'로 받음
            const res = await fetch(`${BASE_URL}/visionOCR`, {
                method: 'POST',
                body: fd,
            });
            const js = await res.json();
            extractedText = (js.text || js.result || '').toString();
        } else {
            extractedText = await extractTextFromAnyFile(file); // ← 여기서 전역 함수 사용
        }
        window.lastExtractedText = extractedText;
    }

    spin(true);

    const formData = new FormData();

    try {
        let extractedText = '';

        if (lastExtractedText && !file) {
            extractedText = lastExtractedText;
        } else if (file) {
            if (isImageFile(file)) {
                const fd = new FormData();
                fd.append('image', file);
                const res = await fetch(`${BASE_URL}/visionOCR`, {
                    method: 'POST',
                    body: fd,
                });
                if (!res.ok) {
                    const raw = await res.text().catch(() => '');
                    throw new Error(
                        `visionOCR HTTP ${res.status} - ${raw || ''}`
                    );
                }
                const js = await res.json();
                extractedText = (js.text || js.result || '').toString();
            } else {
                const text = await extractTextFromAnyFile(file); // 문서 → /fileScan
                extractedText = text || '[텍스트를 추출하지 못했습니다]';
            }
            lastExtractedText = extractedText;
        } else {
            alert('문서를 업로드하거나 텍스트를 먼저 추출해주세요.');
            spin(false);
            return;
        }

        let requestBody = {};
        if (apiEndpoint === 'gptStyleChange') {
            requestBody = { text: extractedText, ...extraPayload };
        } else if (apiEndpoint === 'translate') {
            requestBody = { text: extractedText, ...extraPayload }; // 번역은 text로 통일
        } else {
            requestBody = { content: extractedText, ...extraPayload };
        }
        const apiResponse = await fetch(`${BASE_URL}/${apiEndpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        const data = await apiResponse.json();
        const resultText = data[resultKey];

        console.log('📦 API 응답 데이터 전체:', data); // ✅ 전체 응답 확인
        console.log('📌 추출된 resultText:', resultText);

        resultArea.innerHTML = '';

        if (resultText) {
            resultArea.innerHTML = `<p style="white-space: pre-wrap;">${resultText}</p>`;

            let filename = 'PDF_SCAN_결과.pdf';
            switch (apiEndpoint) {
                case 'gptStyleChange':
                    filename = '스캔_문체_변경.pdf';
                    break;
                case 'mistralRewrite':
                    filename = '스캔_재작성.pdf';
                    break;
                case 'summary':
                    filename = '스캔_요약.pdf';
                    break;
                case 'expand':
                    filename = '스캔_확장.pdf';
                    break;
                case 'cohereHonorific':
                    filename = '스캔_경어체.pdf';
                    break;
                case 'cohereInformal':
                    filename = '스캔_평어체.pdf';
                    break;
                case 'translate':
                    filename = '스캔_번역.pdf';
                    break;
            }

            const pdfBtn = document.getElementById('pdfDownloadBtn');
            if (pdfBtn) {
                const newBtn = pdfBtn.cloneNode(true);
                pdfBtn.replaceWith(newBtn);
                newBtn.addEventListener(
                    'click',
                    () => saveAsPDF(resultArea, filename) // box → resultArea
                );
            }
        } else {
            const errorBox = document.createElement('div');
            errorBox.className = boxClass;
            errorBox.innerText = `⚠️ 처리 실패: ${
                data.error || '알 수 없는 오류'
            }`;
            resultArea.appendChild(errorBox);
        }
    } catch (err) {
        alert('📛 스캔/추출 중 오류: ' + err.message);
        console.error('❌ PDF 추출 실패:', err);
        const errorBox = document.createElement('div');
        errorBox.className = boxClass;
        errorBox.innerText = '❗ 처리 중 오류가 발생했습니다.';
        resultArea.innerHTML = '';
        resultArea.appendChild(errorBox);
    } finally {
        spin(false);
    }
}

async function pdfScanGrammar() {
    const file = getSelectedFile();
    const ocrResult = document.getElementById('ocrResult');
    ocrResult.style.padding = '0'; // 실행 중 패딩 0 적용
    const resultArea =
        document.getElementById('resultArea') ||
        document.getElementById('ocrResult');
    resultArea.innerHTML = '';

    // ✅ 기존 표가 있으면 제거 (중복 방지)
    const oldBox = document.getElementById('grammarBox');
    if (oldBox) oldBox.remove();

    // ✅ 새로 생성
    const grammarBox = document.createElement('div');
    grammarBox.id = 'grammarBox';
    grammarBox.innerHTML = `
        <table id="grammarTable">
            <thead>
                <tr>
                    <th>원문 & 교정문</th>
                    <th>관련 규범 & 설명</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    `;

    ocrResult.appendChild(grammarBox);
    grammarBox.style.display = 'block';

    spin(true);

    // 0) 웜업(콜드스타트/프리플라이트 완화용)
    try {
        await fetch(`${BASE_URL}/whoami`, { cache: 'no-store' });
    } catch {}

    let sourceText = '';
    try {
        if (file) {
            if (isImageFile(file)) {
                const fd = new FormData();
                fd.append('image', file);
                const res = await fetch(`${BASE_URL}/visionOCR`, {
                    method: 'POST',
                    body: fd,
                });
                if (!res.ok) throw new Error(`visionOCR HTTP ${res.status}`);
                const js = await res.json();
                sourceText = (js.text || js.result || '').toString().trim();
            } else {
                sourceText = (await extractTextFromAnyFile(file))
                    .toString()
                    .trim();
            }
        } else {
            const lt =
                (typeof lastExtractedText !== 'undefined' &&
                    lastExtractedText) ||
                window.lastExtractedText;
            sourceText = (lt || '').toString().trim();
        }
    } catch (e) {
        console.error('원문 확보 실패:', e);
    }

    if (!sourceText) {
        spin(false);
        alert(
            '📄 PDF를 업로드하거나 📷 이미지를 스캔하여 텍스트를 먼저 추출해주세요.'
        );
        return;
    }

    // 2) 프록시/모델 한도 보호: 길이 제한
    const MAX_LEN = 8000; // 필요 시 조정
    if (sourceText.length > MAX_LEN) {
        console.warn('⚠️ 길이가 길어 앞부분만 전송합니다:', MAX_LEN);
        sourceText = sourceText.slice(0, MAX_LEN);
    }

    try {
        const resp = await fetch(`${BASE_URL}/mistralGrammar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // JSON이면 프리플라이트 발생
            body: JSON.stringify({ content: sourceText }),
        });

        // 프록시가 만든 응답(413/502 등)은 CORS 헤더가 없어 CORS처럼 보입니다
        if (!resp.ok) {
            const txt = await resp.text().catch(() => '');
            throw new Error(
                `mistralGrammar HTTP ${resp.status} ${txt ? '- ' + txt : ''}`
            );
        }

        const data = await resp.json();
        const raw = (data.result || '').toString();
        if (!raw) {
            resultArea.innerText =
                '⚠️ Mistral AI 오류로 응답 반환이 없습니다. 다시 실행해 주세요.';
            return;
        }
        const text = data.result;

        // ---로 구분된 블록 단위로 나누기
        const blocks = text
            .split(/---+/)
            .map((block) => block.trim())
            .filter(Boolean);

        const grammarTable = document.getElementById('grammarTable');
        const tbody = grammarTable ? grammarTable.querySelector('tbody') : null;
        if (!tbody) {
            console.log('⚠️ tbody 요소가 없습니다. HTML 구조를 확인하세요.');
            spin(false);
            return;
        }
        const tableBody = document.querySelector('#grammarTable tbody');

        for (const block of blocks) {
            const wrong = (block.match(/❌(.*)/) || [])[1]?.trim() || '';
            const correct = (block.match(/✅(.*)/) || [])[1]?.trim() || '';
            const ruleLines = [...block.matchAll(/📖(.*)/g)].map((m) =>
                m[1].trim()
            );
            const explanation =
                (block.match(/✍️([\s\S]*)/) || [])[1]?.trim() || '';

            // 수정할 부분 없을 때만 종료
            if (
                ruleLines.length === 0 &&
                !explanation.trim() &&
                !wrong &&
                !correct
            ) {
                alert('문법 교정할 부분이 없습니다.');
                spin(false);
                return;
            }

            tag_delete = textDiff(wrong, correct);
            del_tag_delete = tag_delete.replace(/<del[^>]*>.*?<\/del>/g, '');
            ins_tag_delete = tag_delete.replace(/<ins[^>]*>.*?<\/ins>/g, '');

            const td1 = document.createElement('td');
            td1.innerHTML = `❌${ins_tag_delete}<br>✅${del_tag_delete}`;

            const style = document.createElement('style');
            style.innerHTML = `
                    del {
                        text-decoration: line-through;
                        background: #ff9999 !important
                    }
                    ins {
                        background: #81ff81 !important
                    }
                `;
            document.head.appendChild(style);

            const td2 = document.createElement('td');
            td2.innerHTML =
                ruleLines.map((r) => `📖${r}`).join('<br>') +
                `<br>✍️${explanation}`;

            const tr = document.createElement('tr');
            tr.appendChild(td1);
            tr.appendChild(td2);
            tableBody.appendChild(tr);

            // 교정문 복사 버튼
            const copyBtn = document.createElement('button');
            copyBtn.innerText = '📋';
            copyBtn.title = '교정문 복사';
            copyBtn.style.border = 'none';
            copyBtn.style.background = 'transparent';
            copyBtn.style.cursor = 'pointer';
            copyBtn.style.fontSize = '16px';
            copyBtn.style.padding = '0';
            copyBtn.style.margin = '0';
            copyBtn.style.display = 'inline'; // 핵심: 인라인으로 붙이기

            copyBtn.onclick = () => {
                navigator.clipboard.writeText(correct.trim());
                copyBtn.innerText = '✅';
                setTimeout(() => (copyBtn.innerText = '📋'), 1000);
            };
            td1.appendChild(copyBtn);

            const pdfBtn = document.getElementById('pdfDownloadBtn');
            if (pdfBtn) {
                pdfBtn.onclick = function () {
                    if (!resultArea) return;

                    // 📋 이모티콘 제거: HTML 문자열에서 제거
                    const cloned = resultArea.cloneNode(true); // 원본 손상 방지
                    cloned.querySelectorAll('*').forEach((el) => {
                        if (el.childNodes.length) {
                            el.childNodes.forEach((node) => {
                                if (node.nodeType === Node.TEXT_NODE) {
                                    node.textContent = node.textContent.replace(
                                        /📋/g,
                                        ''
                                    );
                                }
                            });
                        }
                    });

                    // HTML 그대로 PDF로 저장
                    saveAsPDF(cloned.innerHTML, '문법 교정.pdf');
                };
            }
        }
    } catch (e) {
        console.error('문법 교정 실패:', e);
        // CORS처럼 보이는 경우: 프록시(413/502 등)일 가능성이 큼
        if (resultArea) {
            resultArea.textContent = String(e).includes('HTTP 413')
                ? '⚠️ 텍스트가 너무 길어 일부만 보내 주세요.'
                : String(e).includes('HTTP 502')
                ? '⚠️ 서버가 잠시 응답하지 않았습니다. 잠시 후 다시 시도해주세요.'
                : '❌ 문법 교정 중 오류가 발생했습니다.';
        }
    } finally {
        spin(false);
    }
}

async function pdfScanStyle() {
    const ocrResult = document.getElementById('ocrResult');
    ocrResult.style.padding = '1rem'; // 실행 중 1rem 적용 (기존 resultArea 패딩)

    const style = document.getElementById('styleSelect').value;

    await handlePdfScanAndProcess({
        apiEndpoint: 'gptStyleChange',
        boxClass: 'styleResult',
        resultKey: 'styled_text',
        extraPayload: { style },
    });
}

async function pdfScanRewrite() {
    const ocrResult = document.getElementById('ocrResult');
    ocrResult.style.padding = '1rem'; // 실행 중 1rem 적용 (기존 resultArea 패딩)

    await handlePdfScanAndProcess({
        apiEndpoint: 'mistralRewrite',
        boxClass: 'rewriteBox',
        extraPayload: { source: 'scan' },
    });
}

async function pdfScanSummary() {
    const ocrResult = document.getElementById('ocrResult');
    ocrResult.style.padding = '1rem'; // 실행 중 1rem 적용 (기존 resultArea 패딩)

    await handlePdfScanAndProcess({
        apiEndpoint: 'summary',
        boxClass: 'summaryBox',
    });
}

async function pdfScanExpand() {
    const ocrResult = document.getElementById('ocrResult');
    ocrResult.style.padding = '1rem'; // 실행 중 1rem 적용 (기존 resultArea 패딩)

    await handlePdfScanAndProcess({
        apiEndpoint: 'expand',
        boxClass: 'expandBox',
    });
}

async function pdfScanHonorific() {
    const ocrResult = document.getElementById('ocrResult');
    ocrResult.style.padding = '1rem'; // 실행 중 1rem 적용 (기존 resultArea 패딩)

    await handlePdfScanAndProcess({
        apiEndpoint: 'cohereHonorific',
        boxClass: 'honorificBox',
    });
}

async function pdfScanInformal() {
    const ocrResult = document.getElementById('ocrResult');
    ocrResult.style.padding = '1rem'; // 실행 중 1rem 적용 (기존 resultArea 패딩)

    await handlePdfScanAndProcess({
        apiEndpoint: 'cohereInformal',
        boxClass: 'informalBox',
    });
}

async function pdfScanTranslate() {
    const ocrResult = document.getElementById('ocrResult');
    ocrResult.style.padding = '1rem'; // 실행 중 1rem 적용 (기존 resultArea 패딩)

    const sourceLang = document.getElementById('sourceSelector').value;
    const targetLang = document.getElementById('targetSelector').value;

    if (!lastExtractedText || !lastExtractedText.trim()) {
    }

    await handlePdfScanAndProcess({
        apiEndpoint: 'translate',
        boxClass: 'translateBox',
        resultKey: 'result',
        extraPayload: {
            source: sourceLang,
            target: targetLang,
        },
    });
}

function highlightDiffWithType(original, revised) {
    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(original, revised);
    dmp.diff_cleanupSemantic(diffs);

    const result = [];

    for (let i = 0; i < diffs.length; i++) {
        const [op, text] = diffs[i];

        if (text.trim() === '') {
            result.push(text); // 공백만 diff된 경우 마킹 없이 출력
            continue;
        }

        if (op === 0) {
            result.push(text);
        } else if (op === -1 && diffs[i + 1] && diffs[i + 1][0] === 1) {
            let deletedText = text;
            let addedText = diffs[i + 1][1];

            // 공백만 바뀐 경우 무시
            if (addedText.trim() === '' && deletedText.trim() === '') {
                result.push(addedText);
                i++;
                continue;
            }

            // 공백이 포함된 경우 → 앞뒤 공백 분리
            const prefix = addedText.match(/^\s*/)[0];
            const suffix = addedText.match(/\s*$/)[0];
            const cleanAdded = addedText.trim();

            let cssClass = 'tooltip-wrapper highlight-edit';
            let tip = '표현이 바뀌었어요';

            if (
                /^(은|는|이|가|을|를|에|에서|으로|로|와|과|도|만|까지)$/.test(
                    deletedText.trim()
                )
            ) {
                cssClass = 'tooltip-wrapper highlight-particle';
                tip = '조사를 문맥에 더 잘 맞게 다듬었어요';
            } else if (addedText.length > deletedText.length + 10) {
                cssClass = 'tooltip-wrapper highlight-extended';
                tip = '생각을 더 풍부하게 풀어냈어요';
            } else if (deletedText.length === addedText.length) {
                cssClass = 'tooltip-wrapper highlight-synonym';
                tip = '같은 뜻을 더 적절한 말로 바꿨어요';
            } else {
                cssClass = 'tooltip-wrapper highlight-formal';
                tip = '글 흐름에 더 어울리는 표현이에요';
            }

            result.push(
                `${prefix}<span class="${cssClass}">${cleanAdded}<span class="custom-tooltip">${tip}</span></span>${suffix}`
            );
            i++;
        } else if (op === 1) {
            // 삽입 단독 (del 없이 add만 있을 경우)
            const prefix = text.match(/^\s*/)[0];
            const suffix = text.match(/\s*$/)[0];
            const cleanText = text.trim();

            result.push(
                `${prefix}<span class="tooltip-wrapper highlight-added">${cleanText}<span class="custom-tooltip">새로 추가된 표현이에요</span></span>${suffix}`
            );
        }
    }

    return result.join('');
}

function saveAsPDF(content, filename = 'converted.pdf') {
    let source;

    if (typeof content === 'string') {
        const formattedHTML = `<div style="white-space: pre-wrap;">${content.replace(
            /\n/g,
            '<br>'
        )}</div>`;
        source = formattedHTML;
    } else if (content instanceof HTMLElement) {
        source = content;
    } else {
        console.error(
            '❗ PDF 저장 실패: content는 문자열 또는 DOM 요소여야 합니다.'
        );
        return;
    }

    html2pdf()
        .set({
            margin: [10, 10, 10, 10], // 여백 mm
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(source)
        .save();
}

async function performOCR() {
    const resultArea =
        document.getElementById('ocrResult') ||
        document.getElementById('resultArea');
    const grammarBox = document.getElementById('grammarBox');

    // 초기화
    if (grammarBox) grammarBox.style.display = 'none';
    if (resultArea) resultArea.textContent = '';
    spin(true);

    // 0) 웜업(콜드스타트/프리플라이트 완화)
    try {
        await fetch(`${BASE_URL}/whoami`, { cache: 'no-store' });
    } catch {}

    const file = getSelectedFile();

    try {
        let extractedText = '';

        if (file) {
            if (isImageFile(file)) {
                // ✅ 이미지 → /visionOCR
                const fd = new FormData();
                fd.append('image', file); // 이미지일 때는 'image' 필드명으로!
                const res = await fetch(`${BASE_URL}/visionOCR`, {
                    method: 'POST',
                    body: fd,
                });
                if (!res.ok) {
                    const raw = await res.text().catch(() => '');
                    throw new Error(
                        `visionOCR HTTP ${res.status} - ${raw || ''}`
                    );
                }
                const js = await res.json();
                extractedText = (js.text || js.result || '').toString();
            } else {
                // ✅ 문서 → /fileScan
                extractedText = await extractTextFromAnyFile(file);
            }
            window.lastExtractedText = extractedText; // 후속 버튼(요약/번역/문체 등)을 위해 저장
        } else if (window.lastExtractedText) {
            // 파일 없이도 직전 스캔 결과를 재활용(이미지든 문서든 동일)
            extractedText = window.lastExtractedText;
        } else {
            spin(false);
            alert('이미지 또는 문서를 먼저 업로드해 주세요.');
            return;
        }

        // 화면 출력(페이지 구조에 맞게)
        if (resultArea) {
            resultArea.textContent =
                extractedText || '[텍스트를 추출하지 못했습니다]';
        }
    } catch (err) {
        console.error('❌ 스캔 오류:', err);
        alert(`스캔 오류: ${err.message || err}`);
    } finally {
        spin(false);
    }
}

async function translateOCR() {
    const sourceLang =
        document.getElementById('sourceSelector')?.value || 'auto';
    const targetLang = document.getElementById('targetSelector')?.value || 'en';

    if (!lastExtractedText || !lastExtractedText.trim()) {
        alert('먼저 이미지를 스캔해서 텍스트를 추출해주세요.');
        return;
    }

    const spinner = document.getElementById('loadingSpinner');

    const resultArea =
        document.getElementById('ocrResult') ||
        document.getElementById('resultArea');

    if (!spinner) {
        console.warn('❗ spinner 요소가 없습니다.');
    }

    await handlePdfScanAndProcess({
        apiEndpoint: 'translate',
        boxClass: 'translateBox',
        resultKey: 'result',
        extraPayload: {
            source: sourceLang,
            target: targetLang,
        },
    });
}

async function summarizeOCR() {
    if (!lastExtractedText || !lastExtractedText.trim()) {
        alert('먼저 이미지를 스캔해서 텍스트를 추출해주세요.');
        return;
    }

    await handlePdfScanAndProcess({
        apiEndpoint: 'summary',
        boxClass: 'summaryBox',
        extraPayload: { content: lastExtractedText },
    });
}

// 오디오 파일에서 텍스트 추출
async function getSpeechText(file) {
    if (!file) {
        const fileInput = document.getElementById('audioFile');
        file = fileInput ? fileInput.files[0] : null;
    }
    if (!file) throw new Error('업로드할 오디오 파일이 없습니다.');

    const formData = new FormData();
    formData.append('audio', file);

    const response = await fetch(`${BASE_URL}/speech`, {
        method: 'POST',
        body: formData,
    });
    const result = await response.json();

    console.log('인식된 텍스트: ', result.text, '\n', result.time, '초');
    return result.text;
}

async function speechStyle(file = null) {
    const grammarBox = document.getElementById('grammarBox');
    if (grammarBox) grammarBox.style.display = 'none';

    const resultArea = document.getElementById('resultArea');
    const style = document.getElementById('styleSelect').value;
    spin(true);

    try {
        // 음성 → 텍스트 변환
        const audio_text = await getSpeechText(file);

        // 스타일 변환 요청
        const response = await fetch(`${BASE_URL}/gptStyleChange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: audio_text, style: style }),
        });

        const data = await response.json();
        resultArea.innerText =
            data.styled_text || data.error || '오류가 발생했습니다.';

        const pdfBtn = document.getElementById('pdfDownloadBtn');
        if (pdfBtn) {
            pdfBtn.onclick = function () {
                saveAsPDF(resultArea, 'speech.pdf');
            };
        }
    } catch (err) {
        alert('speechStyle 실패: ' + err.message);
        console.error(err);
    } finally {
        spin(false);
    }
}

async function speechRewrite() {
    const grammarBox = document.getElementById('grammarBox');
    if (grammarBox) {
        grammarBox.style.display = 'none';
    }

    const resultArea = document.getElementById('resultArea');
    const fileInput = document.getElementById('audioFile');
    const file = fileInput ? fileInput.files[0] : null;
    spin(true);

    const formData = new FormData();
    if (file) formData.append('audio', file);

    try {
        const response = await fetch(`${BASE_URL}/speech`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        audio_text = result.text;

        console.log('인식된 텍스트: ', audio_text, '\n', result.time, '초');

        const audioRewriteResponse = await fetch(`${BASE_URL}/mistralRewrite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: audio_text }),
        });

        const audioRewriteData = await audioRewriteResponse.json();
        resultArea.innerText =
            audioRewriteData.result ||
            audioRewriteData.error ||
            '오류가 발생했습니다.';

        const pdfBtn = document.getElementById('pdfDownloadBtn');
        if (pdfBtn) {
            pdfBtn.onclick = function () {
                saveAsPDF(resultArea, 'speech.pdf');
            };
        }
    } catch (err) {
        alert('오디오에서 텍스트 추출 실패: ' + err.message);
        console.log(err.message);
        return;
    } finally {
        spin(false);
    }
}

async function speechSummary(file = null) {
    spin(true);
    try {
        const audio_text = await getSpeechText(file);

        const response = await fetch(`${BASE_URL}/summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: audio_text }),
        });

        const data = await response.json();
        document.getElementById('resultArea').innerText =
            data.result || data.error || '오류가 발생했습니다.';

        const pdfBtn = document.getElementById('pdfDownloadBtn');
        if (pdfBtn) {
            pdfBtn.onclick = function () {
                saveAsPDF(resultArea, 'speech.pdf');
            };
        }
    } catch (err) {
        alert('speechSummary 실패: ' + err.message);
    } finally {
        spin(false);
    }
}

async function speechExpand(file = null) {
    spin(true);
    try {
        const audio_text = await getSpeechText(file);

        const response = await fetch(`${BASE_URL}/expand`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: audio_text }),
        });

        const data = await response.json();
        document.getElementById('resultArea').innerText =
            data.result || data.error || '오류가 발생했습니다.';

        const pdfBtn = document.getElementById('pdfDownloadBtn');
        if (pdfBtn) {
            pdfBtn.onclick = function () {
                saveAsPDF(resultArea, 'speech.pdf');
            };
        }
    } catch (err) {
        alert('speechExpand 실패: ' + err.message);
    } finally {
        spin(false);
    }
}

async function speechHonorific(file = null) {
    spin(true);
    try {
        const audio_text = await getSpeechText(file);

        const response = await fetch(`${BASE_URL}/cohereHonorific`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: audio_text }),
        });

        const data = await response.json();
        document.getElementById('resultArea').innerText =
            data.result || data.error || '오류가 발생했습니다.';

        const pdfBtn = document.getElementById('pdfDownloadBtn');
        if (pdfBtn) {
            pdfBtn.onclick = function () {
                saveAsPDF(resultArea, 'speech.pdf');
            };
        }
    } catch (err) {
        alert('speechHonorific 실패: ' + err.message);
    } finally {
        spin(false);
    }
}

// 반말 변환
async function speechInformal(file = null) {
    spin(true);
    try {
        const audio_text = await getSpeechText(file);

        const response = await fetch(`${BASE_URL}/cohereInformal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: audio_text }),
        });

        const data = await response.json();
        document.getElementById('resultArea').innerText =
            data.result || data.error || '오류가 발생했습니다.';

        const pdfBtn = document.getElementById('pdfDownloadBtn');
        if (pdfBtn) {
            pdfBtn.onclick = function () {
                saveAsPDF(resultArea, 'speech.pdf');
            };
        }
    } catch (err) {
        alert('speechInformal 실패: ' + err.message);
    } finally {
        spin(false);
    }
}

// 번역
async function speechTranslate(file = null) {
    spin(true);
    try {
        const audio_text = await getSpeechText(file);

        const sourceLang = document.getElementById('sourceSelector').value;
        const targetLang = document.getElementById('targetSelector').value;

        const response = await fetch(`${BASE_URL}/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: audio_text,
                source: sourceLang,
                target: targetLang,
            }),
        });

        const data = await response.json();
        document.getElementById('resultArea').innerText =
            data.result || data.error || '오류가 발생했습니다.';

        const pdfBtn = document.getElementById('pdfDownloadBtn');
        if (pdfBtn) {
            pdfBtn.onclick = function () {
                saveAsPDF(resultArea, 'speech.pdf');
            };
        }
    } catch (err) {
        alert('speechTranslate 실패: ' + err.message);
    } finally {
        spin(false);
    }
}

let mediaRecorder;
let recordedChunks = [];
let lastRecordedFile = null; // 🔹 마지막 녹음 파일 저장

// 🎤 녹음 시작
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });
        mediaRecorder = new MediaRecorder(stream);

        recordedChunks = [];
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });

            // 👉 webm → wav 변환
            const wavBlob = await blobToWav(audioBlob);
            const wavFile = new File([wavBlob], 'recorded_audio.wav', {
                type: 'audio/wav',
            });

            // 🔹 녹음된 파일을 전역 변수에 저장
            lastRecordedFile = wavFile;
            console.log('녹음된 파일 준비 완료:', wavFile);

            // 녹음된 파일에서 텍스트 추출 및 speechArea에 삽입
            try {
                const text = await getSpeechText(lastRecordedFile);
                const speechArea = document.getElementById('speechArea');
                if (speechArea) {
                    // speechArea.value = text; // textarea면 value 사용
                    speechArea.innerText = text; // div라면 이 줄 사용
                }
                console.log('음성 인식 결과:', text);
            } catch (err) {
                console.error('음성 인식 실패:', err);
                alert('음성 인식 중 오류가 발생했습니다.');
            }
        };

        mediaRecorder.start();
        console.log('녹음 시작');
        document.getElementById('startRecord').disabled = true;
        document.getElementById('stopRecord').disabled = false;
    } catch (err) {
        alert('마이크 접근 실패: ' + err.message);
    }
}

// 녹음 종료
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        console.log('녹음 종료');
        document.getElementById('startRecord').disabled = false;
        document.getElementById('stopRecord').disabled = true;
    }
}
function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    let offset = 0;
    writeString(view, offset, 'RIFF');
    offset += 4;
    view.setUint32(offset, 36 + samples.length * 2, true);
    offset += 4;
    writeString(view, offset, 'WAVE');
    offset += 4;
    writeString(view, offset, 'fmt ');
    offset += 4;
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, 1, true);
    offset += 2; // mono
    view.setUint32(offset, sampleRate, true);
    offset += 4;
    view.setUint32(offset, sampleRate * 2, true);
    offset += 4;
    view.setUint16(offset, 2, true);
    offset += 2;
    view.setUint16(offset, 16, true);
    offset += 2;
    writeString(view, offset, 'data');
    offset += 4;
    view.setUint32(offset, samples.length * 2, true);
    offset += 4;

    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return buffer;
}

async function blobToWav(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const wavBuffer = encodeWAV(channelData, audioBuffer.sampleRate);
    return new Blob([wavBuffer], { type: 'audio/wav' });
}

function initQuillOnce() {
    if (window.quill) return window.quill;

    // (필요시) 포맷/사이즈 화이트리스트 등록
    const Font = Quill.import('formats/font');
    Font.whitelist = [
        'malgun',
        'batang',
        'gungsuh',
        'gulim',
        'noto-sans-kr',
        'sans-serif',
        'serif',
        'monospace',
    ];
    const SizeStyle = Quill.import('attributors/style/size');
    SizeStyle.whitelist = [
        '13.3px',
        '14.7px',
        '16px',
        '18.7px',
        '21.3px',
        '24px',
        '32px',
    ];
    Quill.register(SizeStyle, true);
    Quill.register(Font, true);

    // 실제 에디터 생성 (단 한 번)
    const q = new Quill('#quill', {
        modules: { toolbar: '#quill-toolbar' },
        theme: 'snow',
        placeholder: '여기에 문서를 작성하세요…',
    });
    window.quill = q;

    // 초기 포맷(선택)
    q.setSelection(0, 0, 'silent');
    q.format('font', 'malgun', 'silent');
    const fontSel = document.querySelector('.ql-font');
    if (fontSel) fontSel.value = 'malgun';

    return q;
}

let quill2 = null; // 에디터 텍스트 추출 에디터, 전역(또는 함수 바깥)에 선언

function ensureQuill2() {
    if (quill2) return quill2;
    quill2 = new Quill('#quill2', {
        theme: 'snow',
        modules: { toolbar: false },
    });
    return quill2;
}

function showEditSpinner(label = '처리 중…') {
    const el = document.getElementById('edit_spinner');
    if (!el) return;
    const labelEl = el.querySelector('.edit_spinner__label');
    if (labelEl) labelEl.textContent = label;
    el.setAttribute('aria-hidden', 'false');
}

function hideEditSpinner() {
    const el = document.getElementById('edit_spinner');
    if (!el) return;
    el.setAttribute('aria-hidden', 'true');
}

document.addEventListener('DOMContentLoaded', () => {
    const $editspinner = document.getElementById('edit_spinner');

    const Font = Quill.import('formats/font');
    Font.whitelist = [
        'malgun',
        'batang',
        'gungsuh',
        'gulim',
        'noto-sans-kr',
        'sans-serif',
        'serif',
        'monospace',
    ];
    const SizeStyle = Quill.import('attributors/style/size');
    SizeStyle.whitelist = [
        '13.3px', // 10pt
        '14.7px', // 11pt
        '16px', // 12pt
        '18.7px', // 14pt
        '21.3px', // 16pt
        '24px', // 18pt
        '32px', // 24pt
    ];
    Quill.register(SizeStyle, true);
    Quill.register(Font, true);

    function injectSizePresetBeforeInit() {
        const sel = document.querySelector('#quill-toolbar .ql-size');
        if (!sel) return;
        sel.id = 'sizePreset';
        if (!sel.options.length) {
            sel.innerHTML = `
        <option value="13.3px">10</option>
        <option value="14.7px">11</option>
        <option value="16px"   selected>12</option>
        <option value="18.7px">14</option>
        <option value="21.3px">16</option>
        <option value="24px">18</option>
        <option value="32px">24</option>
        `;
        }
    }

    if (typeof injectSizePresetBeforeInit === 'function') {
        injectSizePresetBeforeInit();
    }

    Quill.register(
        'modules/blotFormatter',
        QuillBlotFormatter.default || QuillBlotFormatter
    );

    const quill = new Quill('#quill', {
        theme: 'snow',
        placeholder: '여기에 문서를 작성하세요…',
        modules: {
            toolbar: '#quill-toolbar',

            blotFormatter: {},
        },
    });

    let SC_lastImg = null;
    quill.root.addEventListener('mousedown', (e) => {
        const t = e.target;
        if (t && t.tagName === 'IMG') {
            SC_lastImg = t;
        }
    });

    function SC_imgInfo(img) {
        if (!img) return null;
        const blot = Quill.find(img);
        if (!blot) return null;
        const index = quill.getIndex(blot);
        return { blot, index, src: img.getAttribute('src') };
    }
    function SC_reselectAt(index) {
        quill.setSelection(index, 1, 'silent');
        const [leaf] = quill.getLeaf(index);
        const node = leaf && leaf.domNode;
        if (node && node.tagName === 'IMG') {
            node.dispatchEvent(new MouseEvent('click', { bubbles: true })); // BlotFormatter 오버레이 갱신
        }
    }

    // === A) 위/아래 한 블록씩 이동 ===
    function moveImage(delta) {
        const info = SC_imgInfo(SC_lastImg);
        if (!info) return;

        // 기존 포맷/폭 기억
        const oldFmt = quill.getFormat(info.index, 1);
        const width =
            SC_lastImg.style.width || SC_lastImg.getAttribute('width') || null;

        // 삭제
        quill.deleteText(info.index, 1, 'user');

        // 목표 인덱스: 현재 블록 경계 기준으로 위/아래
        let target = info.index + delta; // 대략적 이동
        // 안전장치: 문서 범위 내로 클램프
        target = Math.max(0, Math.min(target, quill.getLength() - 1));

        // 삽입
        quill.insertEmbed(target, 'image', info.src, 'user');

        // 복원 + 재선택
        requestAnimationFrame(() => {
            if (width) {
                const [leaf] = quill.getLeaf(target);
                const node = leaf && leaf.domNode;
                if (node) node.style.width = width;
            }
            if (oldFmt.align)
                quill.formatLine(target, 1, { align: oldFmt.align }, 'silent');
            SC_reselectAt(target);
        });
    }

    // === B) 정렬(왼/중/오) ===
    function alignImage(where) {
        const info = SC_imgInfo(SC_lastImg);
        if (!info) return;
        quill.formatLine(info.index, 1, { align: where || false }, 'user');
        requestAnimationFrame(() => SC_reselectAt(info.index));
    }

    // === C) 크기 프리셋 (25/50/75/100%) ===
    function sizeImage(pct) {
        const img = SC_lastImg;
        if (!img) return;
        img.style.width = pct + '%';
        requestAnimationFrame(() => {
            const info = SC_imgInfo(img);
            if (info) SC_reselectAt(info.index);
        });
    }

    // === D) 단축키: Alt+↑/↓ 이동, Alt+1/2/3 정렬, Alt+9/0 크기 ===
    quill.root.addEventListener('keydown', (e) => {
        if (!SC_lastImg) return;
        if (!e.altKey) return;

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                moveImage(-1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                moveImage(+1);
                break;
            case '1': // 왼쪽 정렬
                e.preventDefault();
                alignImage(false);
                break;
            case '2': // 가운데
                e.preventDefault();
                alignImage('center');
                break;
            case '3': // 오른쪽
                e.preventDefault();
                alignImage('right');
                break;
            case '9': // 50%
                e.preventDefault();
                sizeImage(50);
                break;
            case '0': // 100%
                e.preventDefault();
                sizeImage(100);
                break;
        }
    });

    // --- 2) 오버레이 재계산 유틸 (정렬 후 호출) ---
    function SC_refreshOverlay() {
        if (!SC_lastImg) return;

        const blot = Quill.find(SC_lastImg);
        if (!blot) return;

        const bf = quill.getModule('blotFormatter');

        // 레이아웃이 정렬로 바뀐 뒤에 실행되도록 두 프레임 대기
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // 선택을 이미지에 정확히 맞춘 뒤 클릭을 합성해서 BF가 재계산하게 함
                const index = quill.getIndex(blot);
                quill.setSelection(index, 1, 'silent');
                SC_lastImg.dispatchEvent(
                    new MouseEvent('click', { bubbles: true })
                );

                // 내부 오버레이 API가 노출되어 있으면 한 번 더 강제 재배치
                try {
                    if (
                        bf &&
                        bf.overlay &&
                        typeof bf.overlay.reposition === 'function'
                    ) {
                        bf.overlay.reposition();
                    }
                } catch (e) {}
            });
        });
    }

    // --- 3) 툴바 align 핸들러 오버라이드 (정렬 직후 오버레이 재계산) ---
    (function patchAlignHandler(quill) {
        const toolbar = quill.getModule('toolbar');
        if (!toolbar) return;

        const orig =
            toolbar.handlers.align ||
            function (value) {
                quill.format('align', value);
            };

        toolbar.addHandler('align', function (value) {
            // 1) 기존 정렬 동작 수행
            try {
                orig.call(toolbar, value);
            } catch (_) {
                quill.format('align', value);
            }
            // 2) 정렬 렌더가 반영된 뒤 오버레이 재계산
            SC_refreshOverlay();
        });
    })(quill);

    // --- 4) 혹시 툴바가 select(change) 이벤트만 쏘는 경우를 대비한 백업 바인딩 ---
    const qlAlign = document.querySelector('.ql-toolbar .ql-align');
    if (qlAlign) {
        qlAlign.addEventListener('change', () => SC_refreshOverlay());
    }

    // --- 5) 편집기 변화 전반을 감지하는 백업(가벼운 옵저버) ---
    // 정렬로 부모 block의 style/class가 바뀌는 타이밍을 잡아 재계산
    const editorEl = quill.root;
    const observer = new MutationObserver((mutations) => {
        // 이미지가 선택된 상태에서 block 정렬 class/style이 바뀌면 재계산
        if (SC_lastImg) {
            const changed = mutations.some((m) => m.type === 'attributes');
            if (changed) SC_refreshOverlay();
        }
    });
    observer.observe(editorEl, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class', 'style'],
    });

    window.quill = quill;

    (function bootstrapImageResizer() {
        const RETRY_MS = 120;
        let tries = 0;

        function init() {
            const q = window.quill; // ❗ 새로 만들지 말고 이미 생성된 것만 참조
            const ed = q?.root || document.querySelector('#quill .ql-editor');
            const ct =
                q?.container ||
                document.querySelector('#quill').closest('.ql-container');

            if (!q || !ed || !ct) {
                if (tries++ < 80) return setTimeout(init, RETRY_MS);
                console.warn('[qimg] quill not ready, skip');
                return;
            }

            if (document.getElementById('qimgResizer')) {
                console.debug('[qimg] already initialized');
                return;
            }

            // ✅ 오버레이는 컨테이너에 붙이기 (편집내용 영역 X)
            const box = document.createElement('div');
            box.id = 'qimgResizer';
            box.className = 'qimg-resizer hidden';

            ['nw', 'ne', 'sw', 'se'].forEach((pos) => {
                const h = document.createElement('div');
                h.className = 'qimg-handle ' + pos;
                box.appendChild(h);
            });

            if (getComputedStyle(ct).position === 'static')
                ct.style.position = 'relative';
            ct.appendChild(box);

            let activeImg = null;

            const reposition = () => {
                if (!activeImg) return;
                const cr = ct.getBoundingClientRect();
                const ir = activeImg.getBoundingClientRect();
                const left = ir.left - cr.left + ed.scrollLeft;
                const top = ir.top - cr.top + ed.scrollTop;
                box.style.width = ir.width + 'px';
                box.style.height = ir.height + 'px';
                box.style.transform = `translate(${left}px, ${top}px)`;
            };

            const show = (img) => {
                activeImg = img;
                box.classList.remove('hidden');
                reposition();
            };
            const hide = () => {
                activeImg = null;
                box.classList.add('hidden');
            };

            ed.addEventListener('click', (e) => {
                const img =
                    e.target && e.target.tagName === 'IMG' ? e.target : null;
                if (img) show(img);
                else hide();
            });

            ed.addEventListener(
                'scroll',
                () => requestAnimationFrame(reposition),
                { passive: true }
            );
            window.addEventListener(
                'resize',
                () => requestAnimationFrame(reposition),
                { passive: true }
            );
            ed.addEventListener('input', () =>
                requestAnimationFrame(reposition)
            );
            q.on &&
                q.on('text-change', () => requestAnimationFrame(reposition));
            q.on &&
                q.on('selection-change', () =>
                    requestAnimationFrame(reposition)
                );

            const bindLoad = (img) =>
                img.addEventListener(
                    'load',
                    () => requestAnimationFrame(reposition),
                    { once: true }
                );
            ed.querySelectorAll('img').forEach(bindLoad);
            new MutationObserver((muts) => {
                muts.forEach((m) => {
                    m.addedNodes &&
                        m.addedNodes.forEach((n) => {
                            if (n.tagName === 'IMG') bindLoad(n);
                            else if (n.querySelectorAll)
                                n.querySelectorAll('img').forEach(bindLoad);
                        });
                });
            }).observe(ed, { childList: true, subtree: true });

            // 드래그 리사이즈
            function startResize(e) {
                if (!activeImg) return;
                e.preventDefault();
                e.stopPropagation();
                const handle = e.currentTarget;
                const dir =
                    ['nw', 'ne', 'sw', 'se'].find((d) =>
                        handle.classList.contains(d)
                    ) || 'se';
                const pt = (ev) => (ev.touches ? ev.touches[0] : ev);
                const startX = pt(e).clientX;
                const startW = activeImg.getBoundingClientRect().width;

                const editorMaxW = ed.clientWidth - 16;
                const hardMax = Math.max(editorMaxW, 1200);
                const minW = 60;

                const prevSel = document.body.style.userSelect;
                document.body.style.userSelect = 'none';

                function onMove(ev) {
                    const cx = pt(ev).clientX;
                    let dx = cx - startX;
                    if (dir === 'nw' || dir === 'sw') dx = -dx;
                    let newW = Math.round(startW + dx);
                    newW = Math.max(minW, Math.min(newW, hardMax));
                    activeImg.style.width = newW + 'px';
                    activeImg.style.height = 'auto';
                    requestAnimationFrame(reposition);
                }
                function onUp() {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    document.removeEventListener('touchmove', onMove);
                    document.removeEventListener('touchend', onUp);
                    document.body.style.userSelect = prevSel;
                    requestAnimationFrame(reposition);
                }
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
                document.addEventListener('touchmove', onMove, {
                    passive: false,
                });
                document.addEventListener('touchend', onUp);
            }

            ['nw', 'ne', 'sw', 'se'].forEach((pos) => {
                const h = box.querySelector('.qimg-handle.' + pos);
                h.addEventListener('mousedown', startResize);
                h.addEventListener('touchstart', startResize, {
                    passive: false,
                });
            });

            // 이미지가 지워지면 숨김
            ed.addEventListener('input', () => {
                if (activeImg && !ed.contains(activeImg)) hide();
            });

            console.info('[qimg] initialized');
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    })();

    const toolbarMod = quill.getModule('toolbar');

    let __sizeRange = null;
    const toolbarEl = document.getElementById('quill-toolbar');
    const captureRange = () => {
        __sizeRange = quill.getSelection(true);
    };
    toolbarEl
        ?.querySelector('.ql-picker.ql-size')
        ?.addEventListener('mousedown', captureRange);
    document
        .getElementById('sizePreset')
        ?.addEventListener('mousedown', captureRange);
    toolbarEl
        ?.querySelector('.ql-picker.ql-size')
        ?.addEventListener('touchstart', captureRange, {
            passive: true,
        });

    toolbarMod.addHandler('size', (value) => {
        // value가 이제 '16px' 같은 px 문자열
        if (!value) {
            quill.format('size', false);
            return;
        }

        const range = __sizeRange || quill.getSelection();
        if (range && range.length > 0) {
            quill.formatText(range.index, range.length, 'size', value, 'user');
            quill.setSelection(range.index, range.length, 'silent');
        } else {
            quill.format('size', value);
        }
        __sizeRange = null;
    });

    if (quill) {
        try {
            quill.setSelection(0, 0, 'silent');
        } catch {}
        try {
            quill.format('font', 'malgun', 'silent');
        } catch {}
    }

    const fontSel = document.querySelector('.ql-font');
    if (fontSel) {
        fontSel.value = 'malgun';
    }

    const input = document.getElementById('ocrFile');
    const nameEl = document.getElementById('ocrFileName');
    if (input) {
        input.addEventListener('change', function () {
            const file = this.files && this.files[0];
            if (nameEl) {
                nameEl.textContent = file ? file.name : '';
                setHiddenSafe(nameEl, !file);
            }
        });
    }

    /* ========== 공통 유틸 ========== */
    const ready = (fn) =>
        document.readyState === 'loading'
            ? document.addEventListener('DOMContentLoaded', fn)
            : fn();

    function _pickText(x) {
        if (!x) return '';
        if (typeof x === 'string') return x;
        if (Array.isArray(x))
            return x.map(_pickText).filter(Boolean).join('\n');
        if (typeof x === 'object') {
            // 우선순위 키들
            const keys = [
                'text',
                'ocr',
                'ocr_text',
                'content',
                'payload',
                'output',
                'message',
                'result',
                'data',
                'response',
                'lines',
            ];
            for (const k of keys) {
                if (k in x) {
                    const s = _pickText(x[k]);
                    if (s) return s;
                }
            }
            // 아무 키도 못 찾으면 모든 필드를 순회
            for (const v of Object.values(x)) {
                const s = _pickText(v);
                if (s) return s;
            }
        }
        return '';
    }

    /* 0) 레이아웃: 헤더 높이를 CSS 변수로 */
    function setHeaderH() {
        const h = (document.getElementById('header') || {}).offsetHeight || 64;
        document.documentElement.style.setProperty('--header-h', h + 'px');
    }
    window.addEventListener('load', setHeaderH);
    window.addEventListener('resize', setHeaderH);
    setHeaderH();

    /* 1) 내보내기: PDF 저장 (전역) */
    window.saveAsPDF = async function () {
        if (!window.quill) return alert('에디터가 아직 준비되지 않았어요.');
        const content = quill.root;
        html2pdf()
            .set({
                margin: 10,
                filename: 'Editor PDF.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait',
                },
            })
            .from(content)
            .save();
    };

    /* 2) 툴바: 이미지 버튼 → 메뉴 토글 */
    ready(function () {
        const btn = document.getElementById('btn-image');
        const menu = document.getElementById('imgMenu');
        if (!btn || !menu) return;

        const onKey = (e) => {
            if (e.key === 'Escape') close();
        };
        const onDoc = (e) => {
            if (!menu.contains(e.target) && e.target !== btn) close();
        };

        function open() {
            const r = btn.getBoundingClientRect();
            menu.style.top = r.bottom + window.scrollY + 6 + 'px';
            menu.style.left = r.left + window.scrollX + 'px';
            menu.setAttribute('aria-hidden', 'false');
            setTimeout(
                () =>
                    document.addEventListener('click', onDoc, {
                        once: true,
                    }),
                0
            );
            window.addEventListener('keydown', onKey);
        }
        function close() {
            menu.setAttribute('aria-hidden', 'true');
            window.removeEventListener('keydown', onKey);
        }

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            menu.getAttribute('aria-hidden') !== 'false' ? open() : close();
        });
    });

    const OCR = {
        image: {
            url: '/visionOCR',
            method: 'POST',
            field: 'image',
        }, // 예: '/api/vision/ocr'
        pdf: { url: '/fileScan', method: 'POST', field: 'file' }, // 예: '/api/ocr/pdf'
        base: window.BASE_URL || window.API_BASE_URL || '', // ''면 현재 도메인
    };

    // 안전한 URL 결합
    function joinUrl(base, path) {
        if (!base) return path;
        return (
            (base.endsWith('/') ? base.slice(0, -1) : base) +
            (path.startsWith('/') ? '' : '/') +
            path
        );
    }
    // DOM을 매번 다시 가져오기 (초기 로드 타이밍 이슈 방지)
    function _ocrRefs() {
        return {
            modal: document.getElementById('ocrModal'),
            txtArea: document.getElementById('ocrText'),
            btnIns: document.getElementById('ocrInsert'),
            btnClose: document.getElementById('ocrClose'),
            fileIn: document.getElementById('ocrFile'),
        };
    }

    function openModal(text) {
        const { modal } = _ocrRefs();
        if (!modal) return;
        // txtArea.value = (text || '').toString();
        modal.setAttribute('aria-hidden', 'false');

        // ▼ 추가: 모달 열릴 때 상단 메뉴바 숨김 + 이미지 메뉴 닫기
        document.documentElement.classList.add('is-ocr-open');
        const imgMenu = document.getElementById('imgMenu');
        if (imgMenu) imgMenu.setAttribute('aria-hidden', 'true');

        // setTimeout(() => txtArea.focus(), 0);
        setTimeout(() => quill2.focus(), 0);
    }

    function closeModal() {
        const { modal } = _ocrRefs();
        if (modal) modal.setAttribute('aria-hidden', 'true');

        // ▼ 추가: 모달 닫힐 때 메뉴바 복구
        document.documentElement.classList.remove('is-ocr-open');

        // 모달 닫을 때 프롬프트에 적은 텍스트 지우기
        const textarea = document.getElementById('imagePromptText');
        if (textarea) {
            textarea.value = ''; // 텍스트 지우기
        }
    }

    // 메뉴 클릭 직전에 커서 위치 저장 (선택한 위치에 삽입하기 위함)
    let __insertRange = null;
    document.addEventListener('mousedown', (e) => {
        if (e.target.closest('#imgMenu-ocr, #imgMenu-insert') && window.quill) {
            __insertRange = quill.getSelection() ||
                window.__lastQuillRange || {
                    index: quill.getLength(),
                    length: 0,
                };
        }
    });

    // ESC 로 닫기
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // ✅ 단일 위임 핸들러: 닫기 / 삽입 / 이미지 추출
    document.addEventListener('click', async (e) => {
        if (e.target.closest('#ocrClose')) {
            e.preventDefault();
            closeModal();
            return;
        }

        if (e.target.closest('#ocrInsert')) {
            e.preventDefault();
            if (!window.quill) return;
            // const { txtArea } = _ocrRefs();
            const q = window.quill;
            // const text = (txtArea?.value || '').toString();
            const text = (quill2.getText() || '').toString();
            const cur = q.getSelection() || { index: q.getLength(), length: 0 };
            const range = __insertRange || cur;

            q.insertText(range.index, text, 'user');
            q.setSelection(range.index + text.length, 0, 'silent');
            __insertRange = null;
            closeModal();
            return;
        }

        if (e.target.closest('#imgMenu-insert')) {
            e.preventDefault();
            if (!window.quill) return;

            // 메뉴 닫기(선택)
            document
                .getElementById('imgMenu')
                ?.setAttribute('aria-hidden', 'true');

            const picker = ensureImagePicker(); // (②에서 만든 함수)
            picker.onchange = async () => {
                const file = picker.files && picker.files[0];
                picker.value = ''; // 다음 사용 대비 초기화
                if (!file) return;

                try {
                    spin?.(true); // 스피너 유틸 재사용
                    const dataURL = await fileToDataURLCompressed(file, {
                        // (③에서 만든 함수)
                        maxW: 1600,
                        maxH: 1600,
                        quality: 0.9,
                    });

                    const q = window.quill;
                    const range = __insertRange ||
                        q.getSelection(true) || {
                            index: q.getLength(),
                            length: 0,
                        };
                    q.insertEmbed(range.index, 'image', dataURL, 'user');
                    q.setSelection(range.index + 1, 0, 'silent');
                } catch (err) {
                    alert('이미지 삽입 실패: ' + (err?.message || err));
                } finally {
                    __insertRange = null;
                    spin?.(false);
                }
            };

            picker.click(); // 파일 선택창 열기
            return;
        }
    });

    // 전역 또는 초기화 코드 — 페이지 로딩 시 한 번만 실행
    const ocrFileInput = document.getElementById('ocrFileInput');
    const imgMenuocr = document.getElementById('imgMenu-ocr');

    // 버튼 클릭 시 파일 선택창 열기 (한 번만 등록)
    imgMenuocr.addEventListener('click', () => {
        ocrFileInput.value = ''; // 초기화
        ocrFileInput.click(); // 파일 선택창 열기
    });

    // 파일 선택 후 OCR 처리 시작
    ocrFileInput.addEventListener('change', () => {
        const file = ocrFileInput.files[0];
        if (!file) return;
        handleOCR(file);
    });

    // 실제 OCR 처리 로직
    async function handleOCR(file) {
        openModal('추출 중… 잠시만요.');
        spin(true);

        try {
            const name = (file.name || '').toLowerCase();
            const isImage = /\.(png|jpe?g|gif|bmp|webp|tiff?)$/i.test(name);
            const isDocLike =
                /\.(pdf|docx?|hwp|hwpx|xls|xlsx|ppt|pptx|txt)$/i.test(name);

            // 이미지면 /visionOCR, 그 외 문서형이면 /fileScan
            const EP = isImage ? OCR.image : isDocLike ? OCR.pdf : OCR.image;
            const url = joinUrl(OCR.base, EP.url);

            let out = '';

            // 서버 OCR 시도
            try {
                const fd = new FormData();
                fd.append(EP.field, file);
                const init = { method: EP.method };
                if (EP.method.toUpperCase() === 'POST') init.body = fd;

                const res = await fetch(url, init);
                const ct = (
                    res.headers.get('content-type') || ''
                ).toLowerCase();

                if (!res.ok)
                    throw Object.assign(new Error('HTTP ' + res.status), {
                        status: res.status,
                        ct,
                    });

                if (ct.includes('application/json')) {
                    const j = await res.json();
                    console.log('OCR response:', j);
                    out =
                        (typeof _pickText === 'function' ? _pickText(j) : '') ||
                        JSON.stringify(j, null, 2);
                } else {
                    out = await res.text();
                }
            } catch (srvErr) {
                const status = srvErr?.status || 0;
                const methodProblem = status === 405 || status === 404;

                if (
                    isImage &&
                    (methodProblem || !navigator.onLine || status === 0) &&
                    window.Tesseract
                ) {
                    console.warn(
                        'Server OCR failed, fallback to Tesseract.js:',
                        srvErr
                    );
                    const { data } = await Tesseract.recognize(file, 'kor+eng');
                    out = data && data.text ? data.text : '';
                } else {
                    throw srvErr;
                }
            }

            // 에디터 초기화 (필요 시 한 번만 생성)
            if (!quill2) {
                quill2 = new Quill('#quill2', {
                    theme: 'snow',
                    placeholder: '여기에 문서를 작성하세요…',
                    modules: { toolbar: false },
                });
            }

            quill2.setText(out);
        } catch (err) {
            alert('텍스트 추출 실패: ' + (err?.message || err));
        } finally {
            spin(false);
            console.log('텍스트 추출 완료');
        }
    }

    // (옵션) 외부에서 강제로 열고 싶을 때
    document.addEventListener('editor:open-ocr', () => {
        const fake = document.getElementById('imgMenu-ocr');
        if (fake) fake.click();
        else openModal('파일을 선택하고 “이미지 추출”을 누르세요.');
    });
});

function getEditorSelectionText() {
    try {
        if (window.quill) {
            const sel = window.quill.getSelection();
            if (sel && sel.length > 0)
                return window.quill.getText(sel.index, sel.length);
        }
        const ta = document.getElementById('quill');
        if (ta && 'selectionStart' in ta) {
            const { selectionStart: s, selectionEnd: e, value: v } = ta;
            if (e > s) return v.slice(s, e);
        }
    } catch (e) {}
    return '';
}

function replaceEditorSelection(text) {
    try {
        if (window.quill) {
            const sel = window.quill.getSelection(true);
            if (sel) {
                window.quill.deleteText(sel.index, sel.length);
                window.quill.insertText(sel.index, text);
                window.quill.setSelection(sel.index + text.length, 0);
                return;
            }
        }
        const ta = document.getElementById('quill');
        if (ta && 'selectionStart' in ta) {
            const s = ta.selectionStart,
                e = ta.selectionEnd,
                v = ta.value;
            ta.value = v.slice(0, s) + text + v.slice(e);
            ta.selectionStart = ta.selectionEnd = s + text.length;
        }
    } catch (e) {}
}

// 서버 붙이기 전까지 임시 생성기
async function mockGenerate({ task, tone, length, extra, text }) {
    await new Promise((r) => setTimeout(r, 350));
    const lens = ['아주 짧게', '짧게', '중간', '길게', '아주 길게'][
        Math.max(1, Math.min(5, length)) - 1
    ];
    if (task === 'summarize')
        return `요약(${lens}/${tone}): ${text.slice(0, 120)}${
            text.length > 120 ? '…' : ''
        }`;
    if (task === 'translate') return `[영문 번역 샘플/${tone}] ${text}`;
    return `재작성(${lens}/${tone}${extra ? `, +${extra}` : ''})\n\n${text}`;
}

function getQuillSelectionOrAll() {
    const q = window.quill;
    if (q && typeof q.getSelection === 'function') {
        const sel = q.getSelection(true);
        if (sel && sel.length > 0) {
            const text = q.getText(sel.index, sel.length);
            return {
                text,
                isAll: false,
                apply(out) {
                    const attrs = q.getFormat(
                        sel.index,
                        Math.max(sel.length, 1)
                    );
                    q.deleteText(sel.index, sel.length, 'user');
                    q.insertText(sel.index, out, attrs, 'user');
                    q.setSelection(sel.index + out.length, 0, 'silent');
                },
            };
        }
        const len = q.getLength();
        const text = q.getText(0, len);
        return {
            text,
            isAll: true,
            apply(out) {
                q.setText(out);
            },
        };
    }

    // 에디터가 아직이면 아주 안전한 폴백
    const el = document.getElementById('quill');
    const txt = el?.innerText || el?.textContent || '';
    return {
        text: txt,
        isAll: true,
        apply(out) {
            if (el) el.textContent = out;
        },
    };
}

function getQuillSelectionOrAll2() {
    const sel = quill2.getSelection(true);
    if (sel && sel.length > 0) {
        const text = quill2.getText(sel.index, sel.length);
        return {
            text,
            isAll: false,
            apply(out) {
                const attrs = quill2.getFormat(
                    sel.index,
                    Math.max(sel.length, 1)
                );
                quill2.deleteText(sel.index, sel.length, 'user');
                quill2.insertText(sel.index, out, attrs, 'user');
                quill2.setSelection(sel.index + out.length, 0, 'silent');
            },
        };
    }

    const len = quill2.getLength();
    const text = quill2.getText(0, len);
    return {
        text,
        isAll: true,
        apply(out) {
            quill2.setText(out);
        },
    };
}

async function postJSON(url, payload) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status} - ${t}`);
    }
    return res.json();
}

async function doRewrite() {
    const { text, apply } = getQuillSelectionOrAll();
    const content = (text || '').trim();
    if (!content) {
        alert('내용을 입력하세요.');
        return;
    }

    showSpin(true);
    try {
        const data = await postJSON(`${BASE_URL}/mistralRewrite`, {
            content,
        });
        const out = (
            data?.result ??
            data?.text ??
            data?.styled_text ??
            data?.checked ??
            data?.translated ??
            ''
        ).trim();
        if (!out) throw new Error('빈 결과');

        apply(out);
    } catch (e) {
        alert('재작성 실패: ' + e.message);
    } finally {
        showSpin(false);
    }
}

async function doSummary() {
    const { text, apply } = getQuillSelectionOrAll();
    const content = (text || '').trim();
    if (!content) {
        alert('내용을 입력하세요.');
        return;
    }
    showSpin(true);
    try {
        const data = await postJSON(`${BASE_URL}/summary`, {
            content,
        });
        const out = (
            data?.result ??
            data?.text ??
            data?.checked ??
            data?.styled_text ??
            data?.translated ??
            ''
        ).trim();
        if (!out) throw new Error('빈 결과');
        apply(out);
    } catch (e) {
        alert('요약 실패: ' + e.message);
    } finally {
        showSpin(false);
    }
}

async function doExpand() {
    const { text, apply } = getQuillSelectionOrAll();
    const content = (text || '').trim();
    if (!content) {
        alert('내용을 입력하세요.');
        return;
    }
    showSpin(true);
    try {
        const data = await postJSON(`${BASE_URL}/expand`, {
            content,
        }); // 확장 엔드포인트로 변경
        const out = (
            data?.result ??
            data?.text ??
            data?.checked ??
            data?.styled_text ??
            data?.translated ??
            ''
        ).trim();
        if (!out) throw new Error('빈 결과');
        apply(out);
    } catch (e) {
        alert('확장 실패: ' + e.message);
    } finally {
        showSpin(false);
    }
}

async function doStyle() {
    const { text, apply } = getQuillSelectionOrAll();
    const content = (text || '').trim();
    const style = document.getElementById('styleSelector').value;

    if (!content) {
        alert('내용을 입력하세요.');
        return;
    }
    showSpin(true);

    try {
        const data = await postJSON(`${BASE_URL}/gptStyleChange`, {
            text: content,
            style: style,
        });
        const out = (
            data?.result ??
            data?.text ??
            data?.checked ??
            data?.styled_text ??
            data?.translated ??
            ''
        ).trim();
        if (!out) throw new Error('빈 결과');
        apply(out);
    } catch (e) {
        alert('문체변경 실패: ' + e.message);
    } finally {
        showSpin(false);
    }
}

async function doHonorific() {
    const { text, apply } = getQuillSelectionOrAll();
    const content = (text || '').trim();
    if (!content) {
        alert('내용을 입력하세요.');
        return;
    }
    showSpin(true);
    try {
        const data = await postJSON(`${BASE_URL}/cohereHonorific`, {
            content,
        });
        const out = (
            data?.result ??
            data?.text ??
            data?.checked ??
            data?.styled_text ??
            data?.translated ??
            ''
        ).trim();
        if (!out) throw new Error('빈 결과');
        apply(out);
    } catch (e) {
        alert('높임말 변환 실패: ' + e.message);
    } finally {
        showSpin(false);
    }
}

async function doInformal() {
    const { text, apply } = getQuillSelectionOrAll();
    const content = (text || '').trim();
    if (!content) {
        alert('내용을 입력하세요.');
        return;
    }
    showSpin(true);
    try {
        const data = await postJSON(`${BASE_URL}/cohereInformal`, {
            content,
        });
        const out = (
            data?.result ??
            data?.text ??
            data?.checked ??
            data?.styled_text ??
            data?.translated ??
            ''
        ).trim();
        if (!out) throw new Error('빈 결과');
        apply(out);
    } catch (e) {
        alert('반말 변환 실패: ' + e.message);
    } finally {
        showSpin(false);
    }
}

async function doTranslate() {
    const { text, apply } = getQuillSelectionOrAll();
    const content = (text || '').trim();
    if (!content) {
        alert('내용을 입력하세요.');
        return;
    }
    showSpin(true);
    try {
        const data = await postJSON(`${BASE_URL}/translate`, {
            text: content,
            source: 'auto',
            target: 'en',
        });
        const out = (
            data?.result ??
            data?.text ??
            data?.checked ??
            data?.styled_text ??
            data?.translated ??
            ''
        ).trim();
        if (!out) throw new Error('빈 결과');
        apply(out);
    } catch (e) {
        alert('번역 실패: ' + e.message);
    } finally {
        showSpin(false);
    }
}

async function doOCRorFile() {
    const file = document.getElementById('ocrFile').files[0];
    if (!file) {
        alert('파일을 선택하세요.');
        return;
    }

    const form = new FormData();

    if (/\.(png|jpg|jpeg|bmp|tif|tiff)$/i.test(file.name)) {
        form.append('image', file);
        await uploadTo(`${BASE_URL}/visionOCR`, form, 'text');
    } else {
        form.append('file', file);
        await uploadTo(`${BASE_URL}/fileScan`, form, 'text');
    }
}
async function doGrammar() {
    const { text, apply } = getQuillSelectionOrAll();
    const content = (text || '').trim();
    if (!content) {
        alert('선택(또는 전체) 내용이 비어 있어요.');
        return;
    }
    if (content.length >= 300) {
        alert('글자 수가 300자를 초과했습니다. 300자 미만으로 써주십시오.');
        return;
    }

    showSpin(true);
    try {
        const data = await postJSON(`${BASE_URL}/editorGrammar`, {
            content,
        });

        const out = (data?.checked ?? data?.result ?? data?.text ?? '').trim();
        if (!out) throw new Error('빈 결과');

        apply(out);
        console.log('교정된 결과: ', data.checked);
    } catch (e) {
        alert('문법 교정 실패: ' + e.message);
    } finally {
        showSpin(false);
    }
}
async function uploadTo(url, form, expectField = 'text') {
    showSpin(true);
    try {
        const res = await fetch(url, {
            method: 'POST',
            body: form,
        });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status} - ${await res.text()}`);
        }
        const data = await res.json();
        const text = (data[expectField] || data.result || '').toString();
        setEditorText(text.trim());
    } catch (e) {
        alert('불러오기 실패: ' + e.message);
    } finally {
        showSpin(false);
    }
}

// 녹음 시작
async function editorStartRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });
        mediaRecorder = new MediaRecorder(stream);
        console.log('mediaRecorder 생성');

        recordedChunks = [];
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(recordedChunks, {
                type: 'audio/webm',
            });
            console.log('webm 파일');

            // webm → wav 변환
            const wavBlob = await blobToWav(audioBlob);
            const wavFile = new File([wavBlob], 'recorded_audio.wav', {
                type: 'audio/wav',
            });
            console.log('wav 파일로 변환');

            // 녹음된 파일을 전역 변수에 저장
            lastRecordedFile = wavFile;
            console.log('녹음된 파일 준비 완료:', wavFile);
        };

        mediaRecorder.start();
        console.log('녹음 시작');
        document.getElementById('editorStartRecord').disabled = true;
        document.getElementById('editorStopRecord').disabled = false;
        document.getElementById('editorInsertRecord').disabled = true;
    } catch (err) {
        alert('마이크 접근 실패: ' + err.message);
        alert(err.name);
    }
}

// 녹음 종료
function editorStopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        console.log('녹음 종료');
        document.getElementById('editorStartRecord').disabled = false;
        document.getElementById('editorStopRecord').disabled = true;
        document.getElementById('editorInsertRecord').disabled = false;
    }
}

// 녹음 텍스트 삽입
async function editorInsertRecording() {
    // 음성 → 텍스트 변환
    const audio_text = await getSpeechText(lastRecordedFile);

    if (audio_text) {
        const range = quill.getSelection(true); // 현재 커서 위치
        if (range) {
            quill.insertText(range.index, audio_text, 'user');
            // 커서를 삽입한 텍스트 뒤로 이동
            quill.setSelection(range.index + audio_text.length, 0);
        } else {
            // 선택 영역이 없을 경우 맨 끝에 삽입
            quill.insertText(quill.getLength(), audio_text, 'user');
        }
    }

    document.getElementById('editorInsertRecord').disabled = true;
}

async function sendPromptChange() {
    spin(true);
    const promptEl = document.getElementById('promptText');
    const prompt = (promptEl?.value ?? '').trim();
    if (!prompt) {
        alert('프롬프트를 입력하세요.');
        spin(false);
        return;
    }

    // (선택 저장/복원 사용 중이라면) 복원 먼저
    if (window.SelectionStore?.restore) {
        try {
            SelectionStore.restore();
        } catch {}
    }

    // 현재 선택 (에디터에 포커스가 없으면 null)
    let range = quill.getSelection(true);
    if (!range) {
        // 포커스가 없어 selection을 못 받았다면 일단 0 위치로 가드
        quill.focus();
        range = { index: 0, length: 0 };
    }

    // “문서 전체” 기준 원본
    const full = quill.getText(); // 끝에 개행 포함 가능
    const cursorPos = Math.max(0, Math.min(range.index, full.length));
    const length = Math.max(
        0,
        Math.min(range.length || 0, full.length - cursorPos)
    );

    const before = full.slice(0, cursorPos);
    const selected = full.slice(cursorPos, cursorPos + length);
    const after = full.slice(cursorPos + length);

    // getQuillSelectionOrAll은 “적용 방식(apply)”만 쓰고,
    // 원본 텍스트(content)는 이제 full/selected로 직접 컨트롤
    const { apply } = getQuillSelectionOrAll?.() || {
        apply: (out) => {
            // 선택이 있었으면 교체, 없으면 전체 교체
            if (length > 0) {
                quill.deleteText(cursorPos, length, 'user');
                quill.insertText(cursorPos, out, 'user');
                quill.setSelection(cursorPos + out.length, 0, 'silent');
            } else {
                quill.setText(out, 'user');
                quill.setSelection(
                    Math.min(out.length, cursorPos),
                    0,
                    'silent'
                );
            }
        },
    };

    // “커서/현재 위치” 키워드 탐지
    const words = [
        '커서',
        '현재 커서',
        '현재 커서 위치',
        '커서 위치',
        '커서위치',
        '현재커서',
        '현재 위치',
        '현재위치',
    ];
    const hasWord = words.some((w) => prompt.includes(w));

    // showSpin?.(true);
    try {
        if (hasWord) {
            // 커서 앞뒤만 서버에 넘기고, 결과를 커서 위치에 삽입
            const res = await fetch(`${BASE_URL}/promptAdd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ before, after, prompt }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const out = (data?.result ?? '').trim();
            if (!out) throw new Error('빈 결과');

            // 선택이 있으면 먼저 지우고 결과 삽입
            if (length > 0) quill.deleteText(cursorPos, length, 'user');
            quill.insertText(cursorPos, out, 'user');
            quill.setSelection(cursorPos + out.length, 0, 'silent');
        } else {
            // 선택이 있으면 선택만, 없으면 전체를 바꾸는 흐름
            // 서버에는 전체 또는 선택을 넘길 수 있음. 여기선 “내용 전체”로 유지하고, 적용은 apply가 처리.
            const data = await postJSON(`${BASE_URL}/promptChange`, {
                content: full, // ★ 전체 텍스트 보내기 (여기가 핵심)
                prompt: prompt,
            });
            const out = (
                data?.result ??
                data?.text ??
                data?.checked ??
                data?.styled_text ??
                data?.translated ??
                ''
            ).trim();
            if (!out) throw new Error('빈 결과');
            apply(out);
        }
    } catch (e) {
        alert('프롬프트 처리 실패: ' + (e?.message || e));
    } finally {
        // showSpin?.(false);
        spin(false);
    }
}

async function imagePromptChange() {
    const prompt = document.getElementById('imagePromptText').value;
    console.log(prompt);

    const range = quill2.getSelection(true); // 현재 커서 위치

    const { text, apply } = getQuillSelectionOrAll2();
    const content = (text || '').trim();
    console.log('저장된 텍스트:', content);

    const cursorPos = range.index; // 현재 커서 위치
    const length = range.length; // 선택된 길이 (없으면 0)

    // text는 이미 선택된 텍스트
    // 전체 content에서 앞/뒤 분리
    const before = content.substring(0, cursorPos);
    const selected = content.substring(cursorPos, cursorPos + length);
    const after = content.substring(cursorPos + length);

    console.log('앞부분:', before);
    console.log('선택된 부분:', selected);
    console.log('뒷부분:', after);

    const words = [
        '커서',
        '현재 커서',
        '현재 커서 위치',
        '커서 위치',
        '커서위치',
        '현재커서',
        '현재 위치',
        '현재위치',
    ];

    const hasWord = words.some((word) => prompt.includes(word));

    if (!content) {
        alert('내용을 입력하세요.');
        spin(false);
        return;
    }
    spin(true);
    if (hasWord) {
        try {
            const response = await fetch(`${BASE_URL}/promptAdd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    before: before,
                    after: after,
                    prompt: prompt,
                }),
            });

            const data = await response.json();

            if (data.result) {
                quill2.insertText(range.index, data.result, 'user');
                // 커서를 삽입한 텍스트 뒤로 이동
                quill2.setSelection(range.index + data.result.length, 0);
            } else {
                alert('data.result가 없습니다.');
            }
        } catch {
            alert('프롬프트 추가 실패: ' + e.message);
        } finally {
            spin(false);
            console.log('텍스트 추출 프롬프트 적용 완료');
        }
    } else {
        try {
            const data = await postJSON(`${BASE_URL}/promptChange`, {
                content: content,
                prompt: prompt,
            });
            const out = (
                data?.result ??
                data?.text ??
                data?.checked ??
                data?.styled_text ??
                data?.translated ??
                ''
            ).trim();
            if (!out) throw new Error('빈 결과');
            apply(out);
        } catch (e) {
            alert('프롬프트 수정 실패: ' + e.message);
        } finally {
            spin(false);
        }
    }
}

(function () {
    'use strict';
    console.log('[sc-drawer] init');
    const dock =
        document.getElementById('scDock') || document.querySelector('.sc-dock');
    let OPEN_KEY = null;

    function ensureDrawer() {
        let drawer = document.getElementById('scDrawer');
        let backdrop = document.getElementById('scDrawerBackdrop');
        if (!drawer) {
            backdrop = document.createElement('div');
            backdrop.id = 'scDrawerBackdrop';
            backdrop.className = 'sc-drawer__backdrop';
            backdrop.hidden = true;

            drawer = document.createElement('aside');
            drawer.id = 'scDrawer';
            drawer.className = 'sc-drawer';
            drawer.setAttribute('aria-hidden', 'true');
            drawer.innerHTML = `
        <div class="sc-drawer__head">
          <div id="scDrawerTitle" class="sc-drawer__title">AI Panel</div>
          <button id="scDrawerClose" class="sc-drawer__close" aria-label="close">✕</button>
        </div>
        <div id="scDrawerBody" class="sc-drawer__body"></div>
        <div id="scDrawerFoot" class="sc-drawer__foot"></div>
      `;
            (document.querySelector('.wrap') || document.body).append(
                backdrop,
                drawer
            );
        }
        return { drawer, backdrop };
    }
    const { drawer, backdrop } = ensureDrawer();
    const titleEl = document.getElementById('scDrawerTitle');
    const bodyEl = document.getElementById('scDrawerBody');
    const footEl = document.getElementById('scDrawerFoot');
    const closeBtn = document.getElementById('scDrawerClose');

    // 2) 템플릿
    const TPL = {
        prompt: {
            title: 'AI 프롬프트',
            body: `
    <div id="scChat" class="sc-chat" role="application" aria-label="AI 대화">
      <div id="scChatList" class="sc-chat__messages" aria-live="polite"></div>

      <div class="sc-chat__scope" id="scChatScope">텍스트: 선택 없음 → 전체 문서</div>

      <div class="sc-chat__composer">
        <textarea id="scChatInput" placeholder="지시문을 입력하고 Enter(또는 ⌘/Ctrl+Enter)로 전송" rows="2"></textarea>
        <button id="scChatSend" class="sc-btn-send">보내기</button>
      </div>
      <div class="sc-chat__hint">Shift+Enter 줄바꿈 • “커서/현재 위치” 등의 단어가 포함되면 커서 기준 삽입 모드로 처리</div>
    </div>
  `,
            foot: `
    <button id="scChatApply" class="sc-btn" disabled>적용</button>
    <button id="scChatCopy"  class="sc-btn" disabled>복사</button>
    <button id="scChatNew"   class="sc-btn">새 대화</button>
  `,
        },

        translate: {
            title: '번역',
            body: `
    <div class="sc-tr">
      <div class="sc-row">
  <label class="sc-label">언어</label>


  <div class="sc-tr__langs sc-tr__langs--one">
    <span class="sc-inline-label__text">원본</span>
    <div class="sc-select sc-select--lg sc-select--native">
      <select id="trSource">
        <option value="auto" selected>자동 감지</option>
                            <option value="gu">구자라트어</option>
                            <option value="el">그리스어</option>
                            <option value="ne">네팔어</option>
                            <option value="nl">네덜란드어</option>
                            <option value="de">독일어</option>
                            <option value="ru">러시아어</option>
                            <option value="ro">루마니아어</option>
                            <option value="mr">마라티어</option>
                            <option value="ms">말레이어</option>
                            <option value="vi">베트남어</option>
                            <option value="bn">벵골어</option>
                            <option value="sv">스웨덴어</option>
                            <option value="es">스페인어</option>
                            <option value="af">아프리칸스어</option>
                            <option value="ar">아랍어</option>
                            <option value="en">영어</option>
                            <option value="uk">우크라이나어</option>
                            <option value="it">이탈리아어</option>
                            <option value="ja">일본어</option>
                            <option value="jv">자바어</option>
                            <option value="ka">조지아어</option>
                            <option value="zh-CN">중국어(간체)</option>
                            <option value="zh-TW">중국어(번체)</option>
                            <option value="ta">타밀어</option>
                            <option value="th">태국어</option>
                            <option value="tr">터키어</option>
                            <option value="fa">페르시아어</option>
                            <option value="pt">포르투갈어</option>
                            <option value="pl">폴란드어</option>
                            <option value="fr">프랑스어</option>
                            <option value="ko">한국어</option>
                            <option value="hi">힌디어</option>
                            </select>
    </div>

    <!-- 가운데 스왑 버튼 -->
    <button type="button" class="sc-tr__swap" id="trSwap" aria-label="언어 교환" title="언어 교환(원본 ↔ 대상)">↔</button>

    <span class="sc-inline-label__text">대상</span>
    <div class="sc-select sc-select--lg sc-select--native">
      <select id="trTarget">
                            <option value="gu">구자라트어</option>
                            <option value="el">그리스어</option>
                            <option value="ne">네팔어</option>
                            <option value="nl">네덜란드어</option>
                            <option value="de">독일어</option>
                            <option value="ru">러시아어</option>
                            <option value="ro">루마니아어</option>
                            <option value="mr">마라티어</option>
                            <option value="ms">말레이어</option>
                            <option value="vi">베트남어</option>
                            <option value="bn">벵골어</option>
                            <option value="sv">스웨덴어</option>
                            <option value="es">스페인어</option>
                            <option value="af">아프리칸스어</option>
                            <option value="ar">아랍어</option>
                            <option value="en">영어</option>
                            <option value="uk">우크라이나어</option>
                            <option value="it">이탈리아어</option>
                            <option value="ja">일본어</option>
                            <option value="jv">자바어</option>
                            <option value="ka">조지아어</option>
                            <option value="zh-CN">중국어(간체)</option>
                            <option value="zh-TW">중국어(번체)</option>
                            <option value="ta">타밀어</option>
                            <option value="th">태국어</option>
                            <option value="tr">터키어</option>
                            <option value="fa">페르시아어</option>
                            <option value="pt">포르투갈어</option>
                            <option value="pl">폴란드어</option>
                            <option value="fr">프랑스어</option>
                            <option value="ko">한국어</option>
                            <option value="hi">힌디어</option>
      </select>
    </div>
  </div>
</div>

      <div class="sc-row">
        <label class="sc-label">대상 범위</label>
        <div class="sc-tr__scope">
          <label class="sc-radio"><input type="radio" name="trScope" value="doc" checked> 문서 전체</label>
          <label class="sc-radio"><input type="radio" name="trScope" value="sel"> 드래그로 선택 <span id="trSelCount" class="sc-meta"></span></label>
          <label class="sc-radio"><input type="radio" name="trScope" value="input"> 직접 입력</label>
        </div>
      </div>

      <div class="sc-row" id="trCustomWrap" hidden>
        <label class="sc-label">입력 텍스트</label>
        <textarea id="trCustomInput" rows="5" class="textarea_SC" placeholder="번역할 문장을 입력하세요..."></textarea>
      </div>

      <div class="sc-section">
        <div class="sc-label">결과</div>
        <div id="trResult" class="sc-result sc-surface translateBox"></div>
      </div>
    </div>
  `,
            foot: `
    <button id="scTranslateRun" class="sc-btn sc-btn--primary">번역</button>
    <button id="trApply" class="sc-btn sc-btn--ghost" disabled>적용</button>
    <button id="trCopy"  class="sc-btn sc-btn--ghost" disabled>복사</button>
  `,
        },

        style: {
            title: '문체 변경',
            body: `
    <div class="st">
      <!-- 문체 선택 -->
      <div class="sc-row">
        <label class="sc-label">문체</label>
        <div class="st-style-line">
          <div class="sc-select sc-select--native">
            <select id="stStyle">
              <option value="casual">구어체</option>
                            <option value="formal">격식체</option>
                            <option value="literary">문학체</option>
                            <option value="academic">학술체</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 대상 범위 -->
      <div class="sc-row">
        <label class="sc-label">대상 범위</label>
        <div class="sc-tr__scope" id="stScopeWrap">
          <label class="sc-radio"><input type="radio" name="stScope" value="doc" checked> 문서 전체</label>
          <label class="sc-radio"><input type="radio" name="stScope" value="sel"> 드래그로 선택 <span id="stSelCount" class="sc-meta"></span></label>
          <label class="sc-radio"><input type="radio" name="stScope" value="input"> 직접 입력</label>
        </div>
      </div>

      <!-- 직접 입력 -->
      <div class="sc-row" id="stCustomWrap" hidden>
        <label class="sc-label">입력 텍스트</label>
        <textarea id="stCustomInput" rows="5" class="textarea_SC" placeholder="문체를 바꿀 문장을 입력하세요..."></textarea>
      </div>

      <!-- 결과 -->
      <div class="sc-section">
        <div class="sc-label">결과</div>
        <div id="stResult" class="sc-result sc-surface translateBox"></div>
      </div>
    </div>
  `,
            foot: `
    <button id="scStyleRun" class="sc-btn sc-btn--primary">변환</button>
    <button id="stApply" class="sc-btn sc-btn--ghost" disabled>적용</button>
    <button id="stCopy"  class="sc-btn sc-btn--ghost" disabled>복사</button>
  `,
        },

        honorific: {
            title: '높임말',
            body: `
    <div class="hn">
      <!-- 높임말 스타일 -->
      <div class="sc-row">
       <label class="sc-label">종결어미</label>
        <div class="hn-style-line">
          <div class="sc-select sc-select--native">
            <select id="hnLevel">
              <option value="haeyo" selected>-해요</option>
              <option value="hamnida">-합니다</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 대상 범위 -->
      <div class="sc-row">
        <label class="sc-label">대상 범위</label>
        <div class="sc-tr__scope" id="hnScopeWrap">
          <label class="sc-radio"><input type="radio" name="hnScope" value="doc" checked> 문서 전체</label>
          <label class="sc-radio"><input type="radio" name="hnScope" value="sel"> 드래그로 선택 <span id="hnSelCount" class="sc-meta"></span></label>
          <label class="sc-radio"><input type="radio" name="hnScope" value="input"> 직접 입력</label>
        </div>
      </div>

      <!-- 직접 입력 -->
      <div class="sc-row" id="hnCustomWrap" hidden>
        <label class="sc-label">입력 텍스트</label>
        <textarea id="hnCustomInput" rows="5" class="textarea_SC" placeholder="높임말로 바꿀 문장을 입력하세요..."></textarea>
      </div>

      <!-- 결과 -->
      <div class="sc-section">
        <div class="sc-label">결과</div>
        <div id="hnResult" class="sc-result sc-surface translateBox"></div>
      </div>
    </div>
  `,
            foot: `
    <button id="scHonorRun" class="sc-btn sc-btn--primary">변환</button>
    <button id="hnApply" class="sc-btn sc-btn--ghost" disabled>적용</button>
    <button id="hnCopy"  class="sc-btn sc-btn--ghost" disabled>복사</button>
  `,
        },

        informal: {
            title: '반말',
            body: `
    <div class="ifm">
      <!-- 대상 범위 -->
      <div class="sc-row">
        <label class="sc-label">대상 범위</label>
        <div class="sc-tr__scope" id="ifmScopeWrap">
          <label class="sc-radio"><input type="radio" name="ifmScope" value="doc" checked> 문서 전체</label>
          <label class="sc-radio"><input type="radio" name="ifmScope" value="sel"> 드래그로 선택 <span id="ifmSelCount" class="sc-meta"></span></label>
          <label class="sc-radio"><input type="radio" name="ifmScope" value="input"> 직접 입력</label>
        </div>
      </div>

      <!-- 직접 입력 -->
      <div class="sc-row" id="ifmCustomWrap" hidden>
        <label class="sc-label">입력 텍스트</label>
        <textarea id="ifmCustomInput" rows="5" class="textarea_SC" placeholder="하다(다체)로 바꿀 문장을 입력해 줘"></textarea>
      </div>

      <!-- 결과 -->
      <div class="sc-section">
        <div class="sc-label">결과</div>
        <div id="ifmResult" class="sc-result sc-surface translateBox"></div>
      </div>
    </div>
  `,
            foot: `
    <button id="scInformalRun" class="sc-btn sc-btn--primary">변환</button>
    <button id="ifmApply" class="sc-btn sc-btn--ghost" disabled>적용</button>
    <button id="ifmCopy"  class="sc-btn sc-btn--ghost" disabled>복사</button>
  `,
        },

        rewrite: {
            title: '재작성',
            body: `
    <div class="rw">
      <!-- 대상 범위 -->
      <div class="sc-row">
        <label class="sc-label">대상 범위</label>
        <div class="sc-tr__scope" id="rwScopeWrap">
          <label class="sc-radio"><input type="radio" name="rwScope" value="doc" checked> 문서 전체</label>
          <label class="sc-radio"><input type="radio" name="rwScope" value="sel"> 드래그로 선택 <span id="rwSelCount" class="sc-meta"></span></label>
          <label class="sc-radio"><input type="radio" name="rwScope" value="input"> 직접 입력</label>
        </div>
      </div>

      <!-- 직접 입력 -->
      <div class="sc-row" id="rwCustomWrap" hidden>
        <label class="sc-label">입력 텍스트</label>
        <textarea id="rwCustomInput" rows="5" class="textarea_SC" placeholder="자연스럽게 재작성할 문장을 입력하세요"></textarea>
      </div>

      <!-- 결과 -->
      <div class="sc-section">
        <div class="sc-label">결과</div>
        <div id="rwResult" class="sc-result sc-surface translateBox"></div>
      </div>
    </div>
  `,
            foot: `
    <button id="scRewriteRun" class="sc-btn sc-btn--primary">재작성</button>
    <button id="rwApply" class="sc-btn sc-btn--ghost" disabled>적용</button>
    <button id="rwCopy"  class="sc-btn sc-btn--ghost" disabled>복사</button>
  `,
        },

        summary: {
            title: '요약',
            body: `
    <div class="sm">
      <!-- 요약 포맷 -->
      <div class="sc-row">
        <label class="sc-label">형식</label>
        <div class="sm-style-line">
          <div class="sc-select sc-select--native">
            <select id="smFormat">
              <option value="paragraph" selected>기본</option>
              <option value="bullets">목록화</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 대상 범위 -->
      <div class="sc-row">
        <label class="sc-label">대상 범위</label>
        <div class="sc-tr__scope" id="smScopeWrap">
          <label class="sc-radio"><input type="radio" name="smScope" value="doc" checked> 문서 전체</label>
          <label class="sc-radio"><input type="radio" name="smScope" value="sel"> 드래그로 선택 <span id="smSelCount" class="sc-meta"></span></label>
          <label class="sc-radio"><input type="radio" name="smScope" value="input"> 직접 입력</label>
        </div>
      </div>

      <!-- 직접 입력 -->
      <div class="sc-row" id="smCustomWrap" hidden>
        <label class="sc-label">입력 텍스트</label>
        <textarea id="smCustomInput" rows="5" class="textarea_SC" placeholder="요약할 내용을 입력하세요"></textarea>
      </div>

      <!-- 결과 -->
      <div class="sc-section">
        <div class="sc-label">결과</div>
        <div id="smResult" class="sc-result sc-surface translateBox"></div>
      </div>
    </div>
  `,
            foot: `
    <button id="scSummaryRun" class="sc-btn sc-btn--primary">요약</button>
    <button id="smApply" class="sc-btn sc-btn--ghost" disabled>적용</button>
    <button id="smCopy"  class="sc-btn sc-btn--ghost" disabled>복사</button>
  `,
        },

        expand: {
            title: '확장',
            body: `
    <div class="ex">
      <!-- 모드 선택 -->
      <div class="sc-row">
        <label class="sc-label">모드</label>
        <div class="sc-tr__scope" id="exModeWrap">
          <label class="sc-radio"><input type="radio" name="exMode" value="length" checked> 길이 늘리기</label>
          <label class="sc-radio"><input type="radio" name="exMode" value="sentences"> 문장 추가</label>
        </div>
      </div>

      <!-- 길이 증가율 (레벨) -->
      <div class="sc-row ex-ctrl ex-ctrl--length">
        <label class="sc-label">길이 증가율</label>
        <div class="sc-select sc-select--native">
          <select id="exLenLevel">
            <option value="low">가볍게</option>
            <option value="medium" selected>보통</option>
            <option value="high">많이</option>
            <!-- <option value="xhigh">아주 많이</option> -->
          </select>
        </div>
      </div>

      <!-- 문장 추가 -->
      <div class="sc-row ex-ctrl ex-ctrl--sentences" hidden>
        <label class="sc-label">추가 문장 수</label>
        <input id="exSentences" type="number" min="1" max="50" value="1" class="sc-input-number" style="width:110px;">
      </div>

      <!-- 대상 범위 -->
      <div class="sc-row">
        <label class="sc-label">대상 범위</label>
        <div class="sc-tr__scope" id="exScopeWrap">
          <label class="sc-radio"><input type="radio" name="exScope" value="doc" checked> 문서 전체</label>
          <label class="sc-radio"><input type="radio" name="exScope" value="sel"> 드래그한 부분 <span id="exSelCount" class="sc-meta"></span></label>
          <label class="sc-radio"><input type="radio" name="exScope" value="input"> 직접 입력</label>
        </div>
      </div>

      <!-- 직접 입력 -->
      <div class="sc-row" id="exCustomWrap" hidden>
        <label class="sc-label">입력 텍스트</label>
        <textarea id="exCustomInput" rows="5" class="textarea_SC" placeholder="확장할 문장을 입력하세요..."></textarea>
      </div>

      <!-- 결과 -->
      <div class="sc-section">
        <div class="sc-label">결과</div>
        <div id="exResult" class="sc-result sc-surface translateBox"></div>
      </div>
    </div>
  `,
            foot: `
    <button id="scExpandRun" class="sc-btn sc-btn--primary">확장</button>
    <button id="exApply" class="sc-btn sc-btn--ghost" disabled>적용</button>
    <button id="exCopy"  class="sc-btn sc-btn--ghost" disabled>복사</button>
  `,
        },

        grammar: {
            title: '문법 교정',
            body: `
    <div class="gr">
      <!-- 대상 범위 -->
      <div class="sc-row">
        <label class="sc-label">대상 범위</label>
        <div class="sc-tr__scope" id="grScopeWrap">
          <label class="sc-radio"><input type="radio" name="grScope" value="doc" checked> 문서 전체</label>
          <label class="sc-radio"><input type="radio" name="grScope" value="sel"> 드래그한 부분 <span id="grSelCount" class="sc-meta"></span></label>
          <label class="sc-radio"><input type="radio" name="grScope" value="input"> 직접 입력</label>
        </div>
      </div>

      <!-- 직접 입력 -->
      <div class="sc-row" id="grCustomWrap" hidden>
        <label class="sc-label">입력 텍스트</label>
        <textarea id="grCustomInput" rows="5" class="textarea_SC" placeholder="교정할 텍스트를 입력하세요 (300자 미만)"></textarea>
        <div class="sc-help sm" id="grLenHint">0 / 300자</div>
      </div>

      <!-- 결과 -->
      <div class="sc-section">
        <div class="sc-label">결과</div>
        <div id="grResult" class="sc-result sc-surface translateBox"></div>
      </div>
    </div>
  `,
            foot: `
    <button id="scGrammarRun" class="sc-btn sc-btn--primary">교정</button>
    <button id="grApply" class="sc-btn sc-btn--ghost" disabled>적용</button>
    <button id="grCopy"  class="sc-btn sc-btn--ghost" disabled>복사</button>
  `,
        },
    };

    window.SCTPL = window.SCTPL || {};
    window.registerTemplates =
        window.registerTemplates ||
        function (T) {
            if (T && typeof T === 'object') Object.assign(window.SCTPL, T);
        };
    registerTemplates(TPL);

    function getTitleFor(key) {
        const btn = document.querySelector(
            `.sc-dock__btn[data-action="${key}"]`
        );
        if (btn) {
            const explicit =
                btn.getAttribute('data-title') ||
                btn.getAttribute('aria-label');
            if (explicit && explicit.trim()) return explicit.trim();
            const tip = btn.querySelector('.sc-tip');
            if (tip && tip.textContent.trim()) return tip.textContent.trim();
        }
        return (TPL[key] && TPL[key].title) || 'AI Panel';
    }

    function openPanel(key = 'summary') {
        // 1) key 정규화
        if (!TPL || typeof TPL !== 'object') return;
        if (!key || !TPL[key])
            key = TPL.prompt ? 'prompt' : Object.keys(TPL)[0];
        const tpl = (window.SCTPL && window.SCTPL[key]) || TPL[key];
        if (!tpl) return;

        // 2) DOM 참조
        const WRAP = document.querySelector('.wrap');
        const drawer = document.getElementById('scDrawer');
        const backdrop = document.getElementById('scDrawerBackdrop');
        const titleEl = document.getElementById('scDrawerTitle');
        const bodyEl = document.getElementById('scDrawerBody');
        const footEl = document.getElementById('scDrawerFoot');

        // 3) 제목
        const nextTitle =
            (typeof getTitleFor === 'function' && getTitleFor(key)) ||
            tpl.title ||
            'AI Panel';
        if (titleEl) {
            titleEl.textContent = nextTitle;
            // ⬇️ 기존 i 제거 후 다시 추가 (중복 방지)
            titleEl.querySelector('.sc-info')?.remove();
            titleEl.insertAdjacentHTML(
                'beforeend',
                `<span class="sc-info" data-tip="${getPanelTipText(
                    key
                )}">i</span>`
            );
        }

        // 4) 본문/푸터
        if (bodyEl) bodyEl.innerHTML = tpl.body || '';
        if (footEl) footEl.innerHTML = tpl.foot || '';

        getActiveResultBox();

        if (key === 'prompt') {
            ensurePromptScopeControls();
            try {
                window.__scPromptControlsMO?.disconnect();
            } catch {}
            const drawerBodyEl = document.getElementById('scDrawerBody');
            if (drawerBodyEl) {
                window.__scPromptControlsMO = new MutationObserver(() => {
                    ensurePromptScopeControls();
                });
                window.__scPromptControlsMO.observe(drawerBodyEl, {
                    childList: true,
                    subtree: true,
                });
            }
        }

        // 5) 열기
        drawer?.classList.add('open');
        drawer?.setAttribute('aria-hidden', 'false');
        WRAP?.classList.add('with-panel');

        OPEN_KEY = key;
        if (drawer) {
            drawer.dataset.key = key;
            drawer.setAttribute('data-panel', key);
        }

        if (typeof updateDockActive === 'function') updateDockActive(key);
        if (typeof bindHandlers === 'function') bindHandlers(key);

        if (backdrop) {
            backdrop.hidden = false;
            requestAnimationFrame(() => backdrop.classList.add('show'));
        }

        // 디버그 로그
        console.debug('[sc-drawer] render', {
            key,
            title: nextTitle,
            hasBody: !!tpl.body,
        });
    }

    function closePanel() {
        const WRAP = document.querySelector('.wrap');
        const drawer = document.getElementById('scDrawer');
        const backdrop = document.getElementById('scDrawerBackdrop');
        const bodyEl = document.getElementById('scDrawerBody');
        const footEl = document.getElementById('scDrawerFoot');

        drawer?.classList.remove('open');
        drawer?.setAttribute('aria-hidden', 'true');
        WRAP?.classList.remove('with-panel');

        if (drawer) {
            [
                'opacity',
                'pointer-events',
                'transform',
                'position',
                'top',
            ].forEach((p) => drawer.style.removeProperty(p));

            drawer.removeAttribute('data-panel');
        }

        if (bodyEl) bodyEl.innerHTML = '';
        if (footEl) footEl.innerHTML = '';

        // 상태 초기화
        OPEN_KEY = null;
        if (drawer && 'key' in drawer.dataset) delete drawer.dataset.key;

        updateDockActive(null);

        if (backdrop) {
            backdrop.classList.remove('show');
            setTimeout(() => (backdrop.hidden = true), 180);
        }
    }

    function updateDockActive(key) {
        const dock =
            document.getElementById('scDock') ||
            document.querySelector('.sc-dock');
        if (!dock) return;
        dock.querySelectorAll('.sc-dock__btn').forEach((btn) => {
            btn.classList.remove('is-active');
            btn.removeAttribute('aria-pressed');
        });
        if (!key) return;
        const activeBtn = dock.querySelector(
            `.sc-dock__btn[data-action="${key}"]`
        );
        if (activeBtn) {
            activeBtn.classList.add('is-active');
            activeBtn.setAttribute('aria-pressed', 'true');
        }
    }

    function callFirst(names) {
        for (const n of names) {
            if (typeof window[n] === 'function') {
                window[n]();
                return true;
            }
        }
        console.warn('[sc-drawer] no callable:', names.join(', '));
        return false;
    }
    function bindHandlers(key) {
        const drawerEl = document.getElementById('scDrawer');
        drawerEl?.setAttribute('data-panel', key);
        switch (key) {
            case 'prompt': {
                const $ = (sel) =>
                    document.getElementById('scDrawer')?.querySelector(sel);
                const list = $('#scChatList');
                const input = $('#scChatInput');
                const send = $('#scChatSend');
                const scope = $('#scChatScope');
                const btnNew = $('#scChatNew');
                const btnAp = $('#scChatApply');
                const btnCp = $('#scChatCopy');

                window.__chatSelStable = window.__chatSelStable || null;

                if (window.quill?.on) {
                    window.quill.on('selection-change', (range) => {
                        if (range) {
                            // 커서만 이동(길이 0)은 last만 갱신, stable은 그대로 유지
                            window.__lastQuillRange = range;
                            if (range.length > 0) {
                                // 실제 드래그 선택일 때만 stable 갱신
                                window.__chatSelStable = range;
                            }
                        } else {
                            // blur(null) 시에는 아무것도 덮어쓰지 않음 (유지)
                        }
                    });
                }

                let __chatSel = null;
                let __apSnapSel = null;
                let lastApplyFn = null;
                let lastText = '';
                let lastPlan = { mode: 'cursor' };
                let lastFirst = false;

                function updateScopeLabel() {
                    try {
                        const q = window.quill;
                        if (!q) {
                            scope.textContent = '텍스트: 에디터 없음';
                            return;
                        }
                        const live = q.getSelection() ??
                            window.__lastQuillRange ?? { index: 0, length: 0 };
                        const snap = window.__chatSelStable;
                        const effective =
                            live && live.length > 0 ? live : snap || live;

                        if (effective && effective.length > 0) {
                            const isSnap =
                                !(live && live.length > 0) &&
                                !!(snap && snap.length > 0);
                            scope.textContent =
                                `텍스트: 선택 ${effective.length.toLocaleString()}자` +
                                (isSnap ? ' (고정)' : '');
                        } else {
                            const len = Math.max(0, q.getLength() - 1);
                            scope.textContent = `텍스트: 선택 없음 → 전체 문서(${len.toLocaleString()}자)`;
                        }
                    } catch {}
                }
                updateScopeLabel();
                if (window.quill?.on) {
                    window.quill.on('selection-change', updateScopeLabel);
                    window.quill.on('text-change', updateScopeLabel);
                }

                //ensurePromptScopeControls()로 대체

                /*(function attachScopeControls() {
  if (!scope) return;

  // 중복 방지
  if (scope.nextElementSibling &&
      scope.nextElementSibling.classList?.contains('sc-scope-controls')) return;

  const box = document.createElement('div');
  box.className = 'sc-scope-controls';
  box.style.display = 'inline-flex';
  box.style.gap = '8px';
  box.style.marginLeft = '8px';
  box.style.verticalAlign = 'middle';

  const btnShow = document.createElement('button');
  btnShow.type = 'button';
  btnShow.textContent = '선택 다시 표시';
  btnShow.className = 'sc-btn sc-btn--ghost sc-btn--xs';

  const btnClear = document.createElement('button');
  btnClear.type = 'button';
  btnClear.textContent = '선택 해제(전체)';
  btnClear.className = 'sc-btn sc-btn--ghost sc-btn--xs';

  // 3번 우회 쓰려면 표식 달기(선택)
  btnShow.setAttribute('data-skip-prevent', '1');
  btnClear.setAttribute('data-skip-prevent', '1');

  box.appendChild(btnShow);
  box.appendChild(btnClear);
  scope.insertAdjacentElement('afterend', box);

  // 선택 다시 표시 (포커스→선택→다시 버튼 포커스)
  btnShow.addEventListener('click', (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    const q = window.quill;
    const r = window.__chatSelStable || window.__lastQuillRange || (q && q.getSelection && q.getSelection());
    if (!q || !r || !Number.isFinite(r.index) || r.length <= 0) return;

    requestAnimationFrame(() => {
      try { q.focus(); } catch {}
      requestAnimationFrame(() => {
        try {
          q.setSelection(r.index, r.length); // 하이라이트
          btnClear.focus();                  // 바로 다음 액션 가능
        } catch {}
      });
    });
  });

  // 선택 해제(전체)
  btnClear.addEventListener('click', (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    window.__chatSelStable = null;
    window.__lastQuillRange = null;
    window.__forceFullOnce = true;  // 다음 1회 전체 적용
    updateScopeLabel();
  });
})();*/

                function addMsg(role, text, { typing = false } = {}) {
                    const wrap = document.createElement('div');
                    wrap.className =
                        'sc-msg ' + (role === 'user' ? 'is-user' : 'is-bot');
                    wrap.dataset.role = role;

                    if (typing) {
                        wrap.innerHTML = `<div class="sc-typing"><span></span><span></span><span></span></div>`;
                    } else {
                        wrap.textContent = text;
                    }

                    const meta = document.createElement('div');
                    meta.className = 'sc-msg__meta';
                    const ts = new Date();
                    meta.textContent =
                        (role === 'user' ? '나' : 'AI') +
                        ' · ' +
                        ts.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        });
                    wrap.appendChild(meta);

                    list.appendChild(wrap);
                    list.scrollTop = list.scrollHeight;
                    return wrap;
                }

                async function typeInto(el, text) {
                    el.innerHTML = '';
                    const frag = document.createDocumentFragment();
                    let buf = '';
                    const flush = () => {
                        const s = document.createElement('span');
                        s.textContent = buf;
                        frag.appendChild(s);
                        buf = '';
                    };
                    for (const ch of text) {
                        buf += ch;
                        if (buf.length >= 6) flush();
                        await new Promise((r) => setTimeout(r, 6));
                    }
                    if (buf) flush();
                    el.appendChild(frag);
                }

                async function runPromptFlow(promptText) {
                    const q = window.quill;
                    const cursorWords = [
                        '커서',
                        '현재 커서',
                        '현재 커서 위치',
                        '커서 위치',
                        '커서위치',
                        '현재커서',
                        '현재 위치',
                        '현재위치',
                    ];
                    const wantsCursor = cursorWords.some((w) =>
                        promptText.includes(w)
                    );

                    if (!q) {
                        try {
                            const m = await mockGenerate({
                                task: 'rewrite',
                                text: promptText,
                                tone: 'neutral',
                                length: 3,
                            });
                            return { out: m, apply: () => {} };
                        } catch (e) {
                            return {
                                out: `⚠️ 오류: ${e.message || e}`,
                                apply: () => {},
                            };
                        }
                    }

                    const sel = q.getSelection() ||
                        window.__lastQuillRange || { index: 0, length: 0 };
                    const full = q.getText(0, q.getLength());
                    const selected =
                        sel.length > 0 ? q.getText(sel.index, sel.length) : '';
                    const usedSel =
                        sel && sel.length > 0
                            ? { index: sel.index, length: sel.length }
                            : null;

                    if (wantsCursor) {
                        const before = full.slice(0, sel.index);
                        const after = full.slice(sel.index + sel.length);
                        try {
                            const r = await postJSON(`${BASE_URL}/promptAdd`, {
                                before,
                                after,
                                prompt: promptText,
                            });
                            const out = (r?.result || r?.text || '').toString();
                            const apply = () => {
                                if (usedSel) {
                                    const idx = usedSel.index;
                                    const len = usedSel.length;
                                    window.quill.deleteText(idx, len, 'user');
                                    window.quill.insertText(
                                        usedSel.index,
                                        out,
                                        'user'
                                    );
                                    window.quill.setSelection(
                                        idx + out.length,
                                        0,
                                        'silent'
                                    );
                                } else {
                                    window.quill.setText(out);
                                    window.quill.setSelection(
                                        Math.max(0, out.length - 1),
                                        0,
                                        'silent'
                                    );
                                }
                            };
                            return { out, apply, plan: { mode: 'cursor' } };
                        } catch (e) {
                            const m = await mockGenerate({
                                task: 'rewrite',
                                text: selected || before + after,
                                tone: 'neutral',
                                length: 3,
                                extra: promptText,
                            });
                            return { out: m, apply: () => {} };
                        }
                    }

                    const content = (selected || full || '').trim();
                    try {
                        const r = await postJSON(`${BASE_URL}/promptChange`, {
                            content,
                            prompt: promptText,
                        });
                        const out = (
                            r?.result ||
                            r?.text ||
                            r?.styled_text ||
                            r?.checked ||
                            r?.translated ||
                            ''
                        ).toString();
                        const apply = () => {
                            if (usedSel) {
                                const idx = usedSel.index;
                                const len = usedSel.length;
                                window.quill.deleteText(
                                    usedSel.index,
                                    usedSel.length,
                                    'user'
                                );
                                window.quill.insertText(sel.index, out, 'user');
                                window.quill.setSelection(
                                    sel.index + out.length,
                                    0,
                                    'silent'
                                );
                            } else {
                                window.quill.setText(out);
                                window.quill.setSelection(
                                    Math.max(0, out.length - 1),
                                    0,
                                    'silent'
                                );
                            }
                        };
                        return {
                            out,
                            apply,
                            plan: usedSel
                                ? { mode: 'selection', range: usedSel }
                                : { mode: 'full' },
                        };
                    } catch (e) {
                        const m = await mockGenerate({
                            task: 'rewrite',
                            text: content,
                            tone: 'neutral',
                            length: 3,
                            extra: promptText,
                        });
                        return { out: m, apply: () => {} };
                    }
                }

                async function sendNow() {
                    const text = (input?.value || '').trim();
                    if (!text) return;
                    addMsg('user', text);
                    input.value = '';
                    input.style.height = 'auto';

                    const botWrap = addMsg('bot', '', { typing: true });
                    const bubble = botWrap.firstChild;

                    const { out, apply, plan } = await runPromptFlow(text);
                    lastText = out || '';
                    lastApplyFn = typeof apply === 'function' ? apply : null;
                    lastPlan = plan || { mode: 'cursor' };
                    lastFirst = true;

                    await typeInto(botWrap, lastText);
                    btnAp.disabled = btnCp.disabled = !(
                        lastText && lastText.length
                    );
                    list.scrollTop = list.scrollHeight;
                }
                send?.addEventListener('click', sendNow);
                input?.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendNow();
                    }
                });
                send?.addEventListener('mousedown', () => {
                    if (window.__forceFullOnce) return;

                    const q = window.quill;
                    if (q) {
                        const r =
                            q.getSelection() || window.__lastQuillRange || null;
                        window.__lastQuillRange = r;
                        window.__chatSelStable = r;
                    }
                });
                dock?.addEventListener('mousedown', () => {
                    if (window.__forceFullOnce) return;
                    if (window.quill) {
                        const r =
                            window.quill.getSelection() ||
                            window.__lastQuillRange;
                        window.__lastQuillRange = r;
                        window.__chatSelStable = r;
                    }
                });

                btnAp?.addEventListener('mousedown', () => {
                    if (window.quill) {
                        __apSnapSel =
                            window.quill.getSelection() || __apSnapSel;
                        window.__chatSelStable =
                            __apSnapSel || window.__chatSelStable;
                    }

                    if (input) {
                        const s = input.selectionStart ?? 0;
                        const e = input.selectionEnd ?? 0;
                        __chatSel =
                            e > s
                                ? { start: s, end: e, value: input.value }
                                : null;
                    }
                });

                input?.addEventListener('input', () => {
                    input.style.height = 'auto';
                    input.style.height =
                        Math.min(input.scrollHeight, 160) + 'px';
                });
                btnNew?.addEventListener('click', () => {
                    list.innerHTML = '';
                    input.value = '';
                    input.style.height = 'auto';
                    lastText = '';
                    lastApplyFn = null;
                    btnAp.disabled = btnCp.disabled = true;
                    input.focus();
                });
                btnCp?.addEventListener('click', async () => {
                    if (!lastText) return;
                    await navigator.clipboard.writeText(lastText);
                    btnCp.textContent = '복사됨';
                    setTimeout(() => (btnCp.textContent = '복사'), 1200);
                });

                btnAp?.addEventListener('click', () => {
                    if (!lastText) return;

                    if (__chatSel && input) {
                        const { start, end, value } = __chatSel;
                        input.value =
                            value.slice(0, start) + lastText + value.slice(end);
                        const caret = start + lastText.length;
                        input.selectionStart = input.selectionEnd = caret;
                        __chatSel = null;
                        input.dispatchEvent(
                            new Event('input', { bubbles: true })
                        );
                        input.focus();
                        lastFirst = false;
                        return;
                    }

                    // ② 에디터(Quill) 적용
                    const q = window.quill;
                    if (!q) {
                        if (typeof lastApplyFn === 'function') lastApplyFn();
                        lastFirst = false;
                        return;
                    }

                    const docLen = Math.max(0, q.getLength() - 1);

                    // 우선순위: 클릭 직전 스냅샷 > 고정 스냅샷 > 현재 선택/커서 > 문서 끝
                    let sel = __apSnapSel ||
                        window.__chatSelStable ||
                        q.getSelection(true) || { index: docLen, length: 0 };

                    if (window.__forceFullOnce) {
                        // 전체 적용 1회 강제
                        sel = {
                            index: 0,
                            length: Math.max(0, q.getLength() - 1),
                        };
                        lastPlan = { mode: 'full' };
                        lastFirst = true;
                        window.__forceFullOnce = false; // 일회성 플래그 해제
                    }

                    // 문서 전체 길이만큼 선택된 경우(=전체문서)면 안전하게 삽입 모드로 전환
                    if (sel && sel.length >= docLen)
                        sel = { index: sel.index, length: 0 };

                    // 선택 치환 우선
                    if (sel && sel.length > 0) {
                        q.deleteText(sel.index, sel.length, 'user');
                        q.insertText(sel.index, lastText, 'user');
                        q.setSelection(
                            sel.index + lastText.length,
                            0,
                            'silent'
                        );
                        lastFirst = false;
                    } else if (lastPlan?.mode === 'full' && lastFirst) {
                        q.setText(lastText);
                        q.setSelection(
                            Math.max(0, lastText.length - 1),
                            0,
                            'silent'
                        );
                        lastFirst = false;
                    } else {
                        const pos =
                            typeof sel.index === 'number' ? sel.index : docLen;
                        q.insertText(pos, lastText, 'user');
                        q.setSelection(pos + lastText.length, 0, 'silent');
                        lastFirst = false;
                    }

                    __apSnapSel = null;
                    window.__chatSelStable = null;
                    window.__lastQuillRange = null;
                });

                // ===== 입력창/풋바 높이=====
                (() => {
                    const drawer = document.getElementById('scDrawer');
                    const listWrap =
                        drawer?.querySelector('.sc-chat__messages');
                    const list = drawer?.querySelector('#scChatList');

                    const scrollBottom = () => {
                        if (listWrap)
                            listWrap.scrollTop = listWrap.scrollHeight;
                    };
                    if (list && listWrap) {
                        scrollBottom();
                        new MutationObserver(scrollBottom).observe(list, {
                            childList: true,
                        });
                    }
                })();

                (() => {
                    const drawer = document.getElementById('scDrawer');
                    const composer =
                        drawer?.querySelector('.sc-chat__composer'); // 입력창
                    const foot = drawer?.querySelector('.sc-drawer__foot'); // 하단 3버튼

                    function syncHeights() {
                        const footH = foot?.offsetHeight || 0;
                        const compH = composer?.offsetHeight || 0;
                        drawer?.style.setProperty('--sc-foot-h', footH + 'px');
                        drawer?.style.setProperty(
                            '--sc-composer-h',
                            compH + 'px'
                        );
                    }

                    // 중복 옵저버 방지(패널 다시 열릴 때)
                    try {
                        window.__scRO_comp?.disconnect();
                    } catch {}
                    try {
                        window.__scRO_foot?.disconnect();
                    } catch {}

                    requestAnimationFrame(syncHeights);
                    if (composer) {
                        window.__scRO_comp = new ResizeObserver(syncHeights);
                        window.__scRO_comp.observe(composer);
                    }
                    if (foot) {
                        window.__scRO_foot = new ResizeObserver(syncHeights);
                        window.__scRO_foot.observe(foot);
                    }
                    window.addEventListener('resize', syncHeights, {
                        passive: true,
                    });
                })();

                const selText = getEditorSelectionText?.();
                if (selText) input.value = '';

                setTimeout(() => {
                    const sel = window.quill?.getSelection?.();
                    const hasSelection = !!(sel && sel.length > 0);
                    if (!hasSelection) {
                        document.getElementById('scChatInput')?.focus();
                    }
                }, 60);

                break;
            }
            case 'translate': {
                const $ = (sel) =>
                    document.getElementById('scDrawer')?.querySelector(sel);

                const btnRun = $('#scTranslateRun');
                const btnApply = $('#trApply');
                const btnCopy = $('#trCopy');

                const selCount = $('#trSelCount');
                const wrapCustom = $('#trCustomWrap');
                const inputCustom = $('#trCustomInput');

                const srcSel = $('#trSource');
                const tgtSel = $('#trTarget');

                const wrap = document
                    .getElementById('scDrawer')
                    ?.querySelector('#trScopeWrap, .sc-tr__scope');
                if (wrap && !wrap.id) wrap.id = 'trScopeWrap';

                const swapBtn = $('#trSwap');
                swapBtn?.addEventListener('click', () => {
                    if (!srcSel || !tgtSel) return;
                    const srcVal = srcSel.value;
                    const tgtVal = tgtSel.value;

                    if (srcVal === 'auto') {
                        srcSel.value = tgtVal;
                        swapBtn.classList.add('is-ping');
                        setTimeout(
                            () => swapBtn.classList.remove('is-ping'),
                            260
                        );
                        return;
                    }

                    srcSel.value = tgtVal;
                    tgtSel.value = srcVal;
                    swapBtn.classList.add('is-rot');
                    setTimeout(() => swapBtn.classList.remove('is-rot'), 240);
                });

                const drawer = document.getElementById('scDrawer');
                drawer?.setAttribute('data-panel', 'translate');

                let last = null;

                function updateSelectionMeta() {
                    try {
                        const q = window.quill;
                        if (!q) {
                            selCount && (selCount.textContent = '');
                            return;
                        }
                        const sel = q.getSelection();
                        if (sel && sel.length > 0) {
                            selCount.textContent = `(${sel.length.toLocaleString()}자 선택됨)`;
                        } else {
                            selCount.textContent = '(선택 없음)';
                        }
                    } catch {}
                }
                updateSelectionMeta();
                if (window.quill?.on) {
                    window.quill.on('selection-change', updateSelectionMeta);
                    window.quill.on('text-change', updateSelectionMeta);
                }

                function currentScope() {
                    const r = document.querySelector(
                        '#scDrawer input[name="trScope"]:checked'
                    );
                    return r ? r.value : 'doc';
                }
                function syncCustomWrap() {
                    wrapCustom.hidden = currentScope() !== 'input';
                }
                document
                    .querySelectorAll('#scDrawer input[name="trScope"]')
                    .forEach((r) => {
                        r.addEventListener('change', syncCustomWrap);
                    });
                syncCustomWrap();

                async function mockTranslate(text, src, tgt) {
                    if (!text) return '';
                    return `[${src}→${tgt}] ${text}`;
                }

                btnRun?.addEventListener('click', async () => {
                    const scope = currentScope();
                    const src = srcSel?.value || 'auto';
                    const tgt = tgtSel?.value || 'ko';
                    const q = window.quill;

                    const area = $('#trResult');
                    if (area) {
                        createInlineSpinner(area, '번역 중…');
                        console.debug(
                            '[spinner] insert ->',
                            area.querySelector('[data-role="inline-spinner"]')
                        );
                    }

                    let text = '';
                    let range = null;

                    if (scope === 'doc') {
                        text = q
                            ? q.getText(0, Math.max(0, q.getLength() - 1))
                            : '';
                        if (!text.trim()) {
                            if (area) removeInlineSpinner(area);
                            if (area) area.textContent = '문서가 비어 있어요.';
                            return;
                        }
                    } else if (scope === 'sel') {
                        if (!q) {
                            if (area) removeInlineSpinner(area);
                            if (area) area.textContent = '에디터가 없어요.';
                            return;
                        }
                        const sel = q.getSelection();
                        if (!sel || sel.length === 0) {
                            if (area) removeInlineSpinner(area);
                            if (area)
                                area.textContent = '선택된 내용이 없어요.';
                            return;
                        }
                        text = q.getText(sel.index, sel.length);
                        range = sel;
                    } else {
                        text = (inputCustom?.value || '').trim();
                        if (!text) {
                            if (area) removeInlineSpinner(area);
                            if (area)
                                area.textContent =
                                    '번역할 텍스트를 입력해 주세요.';
                            return;
                        }
                    }

                    let out = '';
                    try {
                        const r = await postJSON(`${BASE_URL}/translate`, {
                            text,
                            source: src,
                            target: tgt,
                        });
                        out = (
                            r?.translated ||
                            r?.result ||
                            r?.text ||
                            ''
                        ).toString();
                    } catch {
                        out = await mockTranslate(text, src, tgt);
                    }

                    if (area) removeInlineSpinner(area);
                    if (area) area.textContent = out;
                    btnApply.disabled = btnCopy.disabled = !(out && out.length);
                    last = {
                        out,
                        scope,
                        rangeSnap: range || null, // 실행 시점의 선택영역 스냅샷
                        first: true, // 첫 적용인지
                    };
                });

                // 적용
                btnApply?.addEventListener('click', () => {
                    if (!last?.out) return;
                    const q = window.quill;
                    if (!q) return;

                    const docLen = Math.max(0, q.getLength() - 1);

                    // 1) 문서 전체 모드: 최초 1회만 전체 치환
                    if (last.scope === 'doc' && last.first) {
                        q.setText(last.out);
                        q.setSelection(
                            Math.max(0, last.out.length - 1),
                            0,
                            'silent'
                        );
                        last.first = false;
                        last.rangeSnap = null;
                        return;
                    }

                    // 2) 선택 앵커 결정: 최초 1회는 실행 당시 스냅샷, 이후엔 "현재 선택/커서"
                    const liveSel = q.getSelection(true);
                    const sel =
                        last.first && last.rangeSnap
                            ? last.rangeSnap
                            : liveSel || { index: docLen, length: 0 };

                    // 3) 선택 치환 또는 커서 삽입
                    if (sel.length > 0) {
                        q.deleteText(sel.index, sel.length, 'user');
                        q.insertText(sel.index, last.out, 'user');
                        q.setSelection(
                            sel.index + last.out.length,
                            0,
                            'silent'
                        );
                    } else {
                        const pos =
                            typeof sel.index === 'number' ? sel.index : docLen;
                        q.insertText(pos, last.out, 'user');
                        q.setSelection(pos + last.out.length, 0, 'silent');
                    }

                    // 4) 이후부터는 스냅샷 비활성
                    last.first = false;
                    last.rangeSnap = null;
                });

                // 복사
                btnCopy?.addEventListener('click', async () => {
                    const txt = ($('#trResult')?.textContent || '').trim();
                    if (!txt) return;
                    await navigator.clipboard.writeText(txt);
                    const b = btnCopy;
                    b.textContent = '복사됨';
                    setTimeout(() => (b.textContent = '복사'), 1200);
                });

                if (currentScope() === 'sel' && window.quill) {
                    try {
                        window.quill.focus();
                    } catch {}
                }
                break;
            }

            case 'style': {
                const $ = (sel) =>
                    document.getElementById('scDrawer')?.querySelector(sel);

                const drawer = document.getElementById('scDrawer');
                drawer?.setAttribute('data-panel', 'style');

                const btnRun = $('#scStyleRun');
                const btnApply = $('#stApply');
                const btnCopy = $('#stCopy');

                const selCount = $('#stSelCount');
                const wrapCustom = $('#stCustomWrap');
                const inputCustom = $('#stCustomInput');
                const styleSel = $('#stStyle');

                let last = null;

                function updateSelectionMeta() {
                    try {
                        const q = window.quill;
                        if (!q) {
                            if (selCount) selCount.textContent = '';
                            return;
                        }
                        const sel = q.getSelection();
                        if (sel && sel.length > 0)
                            selCount.textContent = `(${sel.length.toLocaleString()}자 선택됨)`;
                        else selCount.textContent = '(선택 없음)';
                    } catch {}
                }
                updateSelectionMeta();
                if (window.quill?.on) {
                    window.quill.on('selection-change', updateSelectionMeta);
                    window.quill.on('text-change', updateSelectionMeta);
                }

                function currentScope() {
                    const r = document.querySelector(
                        '#scDrawer input[name="stScope"]:checked'
                    );
                    return r ? r.value : 'doc';
                }
                function syncCustomWrap() {
                    wrapCustom.hidden = currentScope() !== 'input';
                }
                document
                    .querySelectorAll('#scDrawer input[name="stScope"]')
                    .forEach((r) => {
                        r.addEventListener('change', syncCustomWrap);
                    });
                syncCustomWrap();

                // 실행
                btnRun?.addEventListener('click', async () => {
                    const scope = currentScope();
                    const q = window.quill;
                    const style = styleSel?.value || 'formal';
                    const area = $('#stResult');
                    if (area) createInlineSpinner(area, '변환 중…');

                    let text = '';
                    let range = null;

                    if (scope === 'doc') {
                        text = q
                            ? q.getText(0, Math.max(0, q.getLength() - 1))
                            : '';
                        if (!text.trim()) {
                            if (area) removeInlineSpinner(area);
                            if (area) area.textContent = '문서가 비어 있어요.';
                            return;
                        }
                    } else if (scope === 'sel') {
                        if (!q) {
                            if (area) removeInlineSpinner(area);
                            if (area) area.textContent = '에디터가 없어요.';
                            return;
                        }
                        const sel = q.getSelection();
                        if (!sel || sel.length === 0) {
                            if (area) removeInlineSpinner(area);
                            if (area)
                                area.textContent = '선택된 내용이 없어요.';
                            return;
                        }
                        text = q.getText(sel.index, sel.length);
                        range = sel;
                    } else {
                        text = (inputCustom?.value || '').trim();
                        if (!text) {
                            if (area) removeInlineSpinner(area);
                            if (area)
                                area.textContent =
                                    '변환할 텍스트를 입력해 주세요.';
                            return;
                        }
                    }

                    let out = '';
                    try {
                        const r = await postJSON(`${BASE_URL}/gptStyleChange`, {
                            text,
                            style,
                        });
                        out = (
                            r?.result ||
                            r?.text ||
                            r?.styled_text ||
                            ''
                        ).toString();
                    } catch {
                        out = `【${style}】\n\n${text}`;
                    }

                    if (area) removeInlineSpinner(area);
                    if (area) area.textContent = out;
                    btnApply.disabled = btnCopy.disabled = !(out && out.length);
                    last = {
                        out,
                        scope,
                        rangeSnap: range || null,
                        first: true,
                    };
                });

                // 적용
                btnApply?.addEventListener('click', () => {
                    if (!last?.out) return;
                    const q = window.quill;
                    if (!q) return;

                    const docLen = Math.max(0, q.getLength() - 1);

                    // 문서 전체 모드: 최초 1회만 전체 치환
                    if (last.scope === 'doc' && last.first) {
                        q.setText(last.out);
                        q.setSelection(
                            Math.max(0, last.out.length - 1),
                            0,
                            'silent'
                        );
                        last.first = false;
                        last.rangeSnap = null;
                        return;
                    }

                    // 선택 앵커: 최초 1회는 스냅샷, 이후엔 현재 선택/커서
                    const liveSel = q.getSelection(true);
                    const sel =
                        last.first && last.rangeSnap
                            ? last.rangeSnap
                            : liveSel || { index: docLen, length: 0 };

                    if (sel.length > 0) {
                        q.deleteText(sel.index, sel.length, 'user');
                        q.insertText(sel.index, last.out, 'user');
                        q.setSelection(
                            sel.index + last.out.length,
                            0,
                            'silent'
                        );
                    } else {
                        const pos =
                            typeof sel.index === 'number' ? sel.index : docLen;
                        q.insertText(pos, last.out, 'user');
                        q.setSelection(pos + last.out.length, 0, 'silent');
                    }

                    last.first = false;
                    last.rangeSnap = null;
                });

                // 복사
                btnCopy?.addEventListener('click', async () => {
                    const txt = ($('#stResult')?.textContent || '').trim();
                    if (!txt) return;
                    await navigator.clipboard.writeText(txt);
                    const b = btnCopy;
                    b.textContent = '복사됨';
                    setTimeout(() => (b.textContent = '복사'), 1200);
                });

                break;
            }

            case 'honorific': {
                const $ = (sel) =>
                    document.getElementById('scDrawer')?.querySelector(sel);

                const drawer = document.getElementById('scDrawer');
                drawer?.setAttribute('data-panel', 'honorific');

                const btnRun = $('#scHonorRun');
                const btnApply = $('#hnApply');
                const btnCopy = $('#hnCopy');
                const wrapCustom = $('#hnCustomWrap');
                const inputCustom = $('#hnCustomInput');
                const selCount = $('#hnSelCount');
                const levelSel = $('#hnLevel');

                let last = null;

                function updateSelectionMeta() {
                    try {
                        const q = window.quill;
                        if (!q) {
                            if (selCount) selCount.textContent = '';
                            return;
                        }
                        const sel = q.getSelection();
                        selCount.textContent =
                            sel && sel.length > 0
                                ? `(${sel.length.toLocaleString()}자 선택됨)`
                                : '(선택 없음)';
                    } catch {}
                }
                updateSelectionMeta();
                if (window.quill?.on) {
                    window.quill.on('selection-change', updateSelectionMeta);
                    window.quill.on('text-change', updateSelectionMeta);
                }

                function currentScope() {
                    const r = document.querySelector(
                        '#scDrawer input[name="hnScope"]:checked'
                    );
                    return r ? r.value : 'doc';
                }
                function syncCustomWrap() {
                    wrapCustom.hidden = currentScope() !== 'input';
                    if (!wrapCustom.hidden) {
                        setTimeout(() => {
                            document
                                .getElementById('hnCustomInput')
                                ?.scrollIntoView({
                                    block: 'start',
                                    behavior: 'smooth',
                                });
                        }, 0);
                    }
                }
                document
                    .querySelectorAll('#scDrawer input[name="hnScope"]')
                    .forEach((r) => {
                        r.addEventListener('change', syncCustomWrap);
                    });
                syncCustomWrap();

                // 실행
                btnRun?.addEventListener('click', async () => {
                    const scope = currentScope();
                    const q = window.quill;
                    const level = levelSel?.value || 'haeyo';
                    const area = $('#hnResult');
                    if (area) createInlineSpinner(area, '변환 중…');

                    let text = '';
                    let range = null;

                    if (scope === 'doc') {
                        text = q
                            ? q.getText(0, Math.max(0, q.getLength() - 1))
                            : '';
                        if (!text.trim()) {
                            $('#hnResult').textContent = '문서가 비어 있어요.';
                            return;
                        }
                    } else if (scope === 'sel') {
                        if (!q) {
                            $('#hnResult').textContent = '에디터가 없어요.';
                            return;
                        }
                        const sel = q.getSelection();
                        if (!sel || sel.length === 0) {
                            $('#hnResult').textContent =
                                '선택된 내용이 없어요.';
                            return;
                        }
                        text = q.getText(sel.index, sel.length);
                        range = sel;
                    } else {
                        text = (inputCustom?.value || '').trim();
                        if (!text) {
                            $('#hnResult').textContent =
                                '변환할 텍스트를 입력해 주세요.';
                            return;
                        }
                    }

                    let out = '';
                    try {
                        const r = await postJSON(
                            `${BASE_URL}/cohereHonorific`,
                            { content: text, level }
                        );
                        out = (r?.checked || r?.result || r?.text || '')
                            .toString()
                            .trim();
                        if (!out) throw new Error('빈 결과');
                    } catch {
                        const tag =
                            level === 'hamnida'
                                ? '합니다체'
                                : level === 'hasipsio'
                                ? '하십시오체'
                                : '해요체';
                        out = `【높임말 변환: ${tag}】\n\n${text}`;
                    }

                    if (area) removeInlineSpinner(area);
                    if (area) area.textContent = out;
                    btnApply.disabled = btnCopy.disabled = !(out && out.length);
                    $('#hnResult')?.scrollIntoView({
                        block: 'start',
                        behavior: 'smooth',
                    });

                    last = {
                        out,
                        scope,
                        rangeSnap: range || null,
                        first: true,
                    };
                });

                // 적용
                btnApply?.addEventListener('click', () => {
                    if (!last?.out) return;
                    const q = window.quill;
                    if (!q) return;

                    const docLen = Math.max(0, q.getLength() - 1);

                    if (last.scope === 'doc' && last.first) {
                        q.setText(last.out);
                        q.setSelection(
                            Math.max(0, last.out.length - 1),
                            0,
                            'silent'
                        );
                        last.first = false;
                        last.rangeSnap = null;
                        return;
                    }

                    const liveSel = q.getSelection(true);
                    const sel =
                        last.first && last.rangeSnap
                            ? last.rangeSnap
                            : liveSel || { index: docLen, length: 0 };

                    if (sel.length > 0) {
                        q.deleteText(sel.index, sel.length, 'user');
                        q.insertText(sel.index, last.out, 'user');
                        q.setSelection(
                            sel.index + last.out.length,
                            0,
                            'silent'
                        );
                    } else {
                        const pos =
                            typeof sel.index === 'number' ? sel.index : docLen;
                        q.insertText(pos, last.out, 'user');
                        q.setSelection(pos + last.out.length, 0, 'silent');
                    }

                    last.first = false;
                    last.rangeSnap = null;
                });

                // 복사
                btnCopy?.addEventListener('click', async () => {
                    const txt = ($('#hnResult')?.textContent || '').trim();
                    if (!txt) return;
                    await navigator.clipboard.writeText(txt);
                    const b = btnCopy;
                    b.textContent = '복사됨';
                    setTimeout(() => (b.textContent = '복사'), 1200);
                });

                break;
            }

            case 'informal': {
                const $ = (sel) =>
                    document.getElementById('scDrawer')?.querySelector(sel);

                const drawer = document.getElementById('scDrawer');
                drawer?.setAttribute('data-panel', 'informal');

                const btnRun = $('#scInformalRun');
                const btnApply = $('#ifmApply');
                const btnCopy = $('#ifmCopy');
                const wrapCustom = $('#ifmCustomWrap');
                const inputCustom = $('#ifmCustomInput');
                const selCount = $('#ifmSelCount');

                let last = null;
                function updateSelectionMeta() {
                    try {
                        const q = window.quill;
                        if (!q) {
                            selCount && (selCount.textContent = '');
                            return;
                        }
                        const sel = q.getSelection();
                        selCount.textContent =
                            sel && sel.length > 0
                                ? `(${sel.length.toLocaleString()}자 선택됨)`
                                : '(선택 없음)';
                    } catch {}
                }
                updateSelectionMeta();
                if (window.quill?.on) {
                    window.quill.on('selection-change', updateSelectionMeta);
                    window.quill.on('text-change', updateSelectionMeta);
                }

                function currentScope() {
                    const r = document.querySelector(
                        '#scDrawer input[name="ifmScope"]:checked'
                    );
                    return r ? r.value : 'doc';
                }
                function syncCustomWrap() {
                    wrapCustom.hidden = currentScope() !== 'input';
                    if (!wrapCustom.hidden) {
                        setTimeout(() => {
                            document
                                .getElementById('ifmCustomInput')
                                ?.scrollIntoView({
                                    block: 'start',
                                    behavior: 'smooth',
                                });
                        }, 0);
                    }
                }
                document
                    .querySelectorAll('#scDrawer input[name="ifmScope"]')
                    .forEach((r) => {
                        r.addEventListener('change', syncCustomWrap);
                    });
                syncCustomWrap();

                // 실행
                btnRun?.addEventListener('click', async () => {
                    const scope = currentScope();
                    const q = window.quill;
                    const area = $('#ifmResult');
                    if (area) createInlineSpinner(area, '변환 중…');

                    let text = '';
                    let range = null;

                    if (scope === 'doc') {
                        text = q
                            ? q.getText(0, Math.max(0, q.getLength() - 1))
                            : '';
                        if (!text.trim()) {
                            if (area) removeInlineSpinner(area);
                            if (area)
                                area.textContent = '문서가 비어 있습니다.';
                            return;
                        }
                    } else if (scope === 'sel') {
                        if (!q) {
                            if (area) removeInlineSpinner(area);
                            if (area) area.textContent = '에디터가 없습니다.';
                            return;
                        }
                        const sel = q.getSelection();
                        if (!sel || sel.length === 0) {
                            if (area) removeInlineSpinner(area);
                            if (area)
                                area.textContent = '선택한 내용이 없습니다.';
                            return;
                        }
                        text = q.getText(sel.index, sel.length);
                        range = sel;
                    } else {
                        text = (inputCustom?.value || '').trim();
                        if (!text) {
                            if (area) removeInlineSpinner(area);
                            if (area)
                                area.textContent =
                                    '변환할 텍스트를 입력해 주세요.';
                            return;
                        }
                    }

                    let out = '';
                    try {
                        const r = await postJSON(`${BASE_URL}/cohereInformal`, {
                            content: text,
                            ending: 'hada',
                        });
                        out = (r?.checked || r?.result || r?.text || '')
                            .toString()
                            .trim();
                        if (!out) throw new Error('빈 결과');
                    } catch {
                        out = `【반말 변환: 하다】\n\n${text}`;
                    }

                    if (area) removeInlineSpinner(area);
                    if (area) area.textContent = out;
                    btnApply.disabled = btnCopy.disabled = !(out && out.length);
                    $('#ifmResult')?.scrollIntoView({
                        block: 'start',
                        behavior: 'smooth',
                    });

                    last = {
                        out,
                        scope,
                        rangeSnap: range || null,
                        first: true,
                    };
                });

                btnApply?.addEventListener('click', () => {
                    if (!last?.out) return;
                    const q = window.quill;
                    if (!q) return;

                    const docLen = Math.max(0, q.getLength() - 1);

                    if (last.scope === 'doc' && last.first) {
                        q.setText(last.out);
                        q.setSelection(
                            Math.max(0, last.out.length - 1),
                            0,
                            'silent'
                        );
                        last.first = false;
                        last.rangeSnap = null;
                        return;
                    }

                    const liveSel = q.getSelection(true);
                    const sel =
                        last.first && last.rangeSnap
                            ? last.rangeSnap
                            : liveSel || { index: docLen, length: 0 };

                    if (sel.length > 0) {
                        q.deleteText(sel.index, sel.length, 'user');
                        q.insertText(sel.index, last.out, 'user');
                        q.setSelection(
                            sel.index + last.out.length,
                            0,
                            'silent'
                        );
                    } else {
                        const pos =
                            typeof sel.index === 'number' ? sel.index : docLen;
                        q.insertText(pos, last.out, 'user');
                        q.setSelection(pos + last.out.length, 0, 'silent');
                    }

                    last.first = false;
                    last.rangeSnap = null;
                });

                // 복사
                btnCopy?.addEventListener('click', async () => {
                    const txt = ($('#ifmResult')?.textContent || '').trim();
                    if (!txt) return;
                    await navigator.clipboard.writeText(txt);
                    const b = btnCopy;
                    b.textContent = '복사됨';
                    setTimeout(() => (b.textContent = '복사'), 1200);
                });

                break;
            }

            case 'rewrite': {
                const $ = (sel) =>
                    document.getElementById('scDrawer')?.querySelector(sel);

                const drawer = document.getElementById('scDrawer');
                drawer?.setAttribute('data-panel', 'rewrite');

                const btnRun = $('#scRewriteRun');
                const btnApply = $('#rwApply');
                const btnCopy = $('#rwCopy');
                const wrapCustom = $('#rwCustomWrap');
                const inputCustom = $('#rwCustomInput');
                const selCount = $('#rwSelCount');

                let last = null;

                function updateSelectionMeta() {
                    try {
                        const q = window.quill;
                        if (!q) {
                            selCount && (selCount.textContent = '');
                            return;
                        }
                        const sel = q.getSelection();
                        selCount.textContent =
                            sel && sel.length > 0
                                ? `(${sel.length.toLocaleString()}자 선택됨)`
                                : '(선택 없음)';
                    } catch {}
                }
                updateSelectionMeta();
                if (window.quill?.on) {
                    window.quill.on('selection-change', updateSelectionMeta);
                    window.quill.on('text-change', updateSelectionMeta);
                }

                function currentScope() {
                    const r = document.querySelector(
                        '#scDrawer input[name="rwScope"]:checked'
                    );
                    return r ? r.value : 'doc';
                }
                function syncCustomWrap() {
                    wrapCustom.hidden = currentScope() !== 'input';
                    if (!wrapCustom.hidden) {
                        setTimeout(() => {
                            document
                                .getElementById('rwCustomInput')
                                ?.scrollIntoView({
                                    block: 'start',
                                    behavior: 'smooth',
                                });
                        }, 0);
                    }
                }
                document
                    .querySelectorAll('#scDrawer input[name="rwScope"]')
                    .forEach((r) => {
                        r.addEventListener('change', syncCustomWrap);
                    });
                syncCustomWrap();

                // 실행
                btnRun?.addEventListener('click', async () => {
                    const scope = currentScope();
                    const q = window.quill;
                    const area = $('#rwResult');
                    if (area) createInlineSpinner(area, '재작성 중…');

                    let text = '';
                    let range = null;

                    if (scope === 'doc') {
                        text = q
                            ? q.getText(0, Math.max(0, q.getLength() - 1))
                            : '';
                        if (!text.trim()) {
                            $('#rwResult').textContent = '문서가 비어 있어요.';
                            return;
                        }
                    } else if (scope === 'sel') {
                        if (!q) {
                            $('#rwResult').textContent = '에디터가 없어요.';
                            return;
                        }
                        const sel = q.getSelection();
                        if (!sel || sel.length === 0) {
                            $('#rwResult').textContent =
                                '선택된 내용이 없어요.';
                            return;
                        }
                        text = q.getText(sel.index, sel.length);
                        range = sel;
                    } else {
                        text = (inputCustom?.value || '').trim();
                        if (!text) {
                            $('#rwResult').textContent =
                                '재작성할 텍스트를 입력해 주세요.';
                            return;
                        }
                    }

                    let out = '';
                    try {
                        const r = await postJSON(`${BASE_URL}/mistralRewrite`, {
                            content: text,
                        });
                        out = (
                            r?.result ||
                            r?.text ||
                            r?.styled_text ||
                            r?.checked ||
                            ''
                        )
                            .toString()
                            .trim();
                        if (!out) throw new Error('빈 결과');
                    } catch {
                        out = `[재작성 예시]\n\n${text}`;
                    }

                    if (area) removeInlineSpinner(area);
                    if (area) area.textContent = out;
                    btnApply.disabled = btnCopy.disabled = !(out && out.length);

                    $('#rwResult')?.scrollIntoView({
                        block: 'start',
                        behavior: 'smooth',
                    });

                    last = {
                        out,
                        scope,
                        rangeSnap: range || null,
                        first: true,
                    };
                });

                // 적용
                btnApply?.addEventListener('click', () => {
                    if (!last?.out) return;
                    const q = window.quill;
                    if (!q) return;

                    const docLen = Math.max(0, q.getLength() - 1);

                    if (last.scope === 'doc' && last.first) {
                        q.setText(last.out);
                        q.setSelection(
                            Math.max(0, last.out.length - 1),
                            0,
                            'silent'
                        );
                        last.first = false;
                        last.rangeSnap = null;
                        return;
                    }

                    const liveSel = q.getSelection(true);
                    const sel =
                        last.first && last.rangeSnap
                            ? last.rangeSnap
                            : liveSel || { index: docLen, length: 0 };

                    if (sel.length > 0) {
                        q.deleteText(sel.index, sel.length, 'user');
                        q.insertText(sel.index, last.out, 'user');
                        q.setSelection(
                            sel.index + last.out.length,
                            0,
                            'silent'
                        );
                    } else {
                        const pos =
                            typeof sel.index === 'number' ? sel.index : docLen;
                        q.insertText(pos, last.out, 'user');
                        q.setSelection(pos + last.out.length, 0, 'silent');
                    }

                    last.first = false;
                    last.rangeSnap = null;
                });

                // 복사
                btnCopy?.addEventListener('click', async () => {
                    const txt = ($('#rwResult')?.textContent || '').trim();
                    if (!txt) return;
                    await navigator.clipboard.writeText(txt);
                    const b = btnCopy;
                    b.textContent = '복사됨';
                    setTimeout(() => (b.textContent = '복사'), 1200);
                });

                break;
            }

            case 'summary': {
                const $ = (sel) =>
                    document.getElementById('scDrawer')?.querySelector(sel);

                const drawer = document.getElementById('scDrawer');
                drawer?.setAttribute('data-panel', 'summary');

                const btnRun = $('#scSummaryRun');
                const btnApply = $('#smApply');
                const btnCopy = $('#smCopy');
                const wrapCustom = $('#smCustomWrap');
                const inputCustom = $('#smCustomInput');
                const selCount = $('#smSelCount');
                const fmtSel = $('#smFormat');

                let last = null;

                function updateSelectionMeta() {
                    try {
                        const q = window.quill;
                        if (!q) {
                            selCount && (selCount.textContent = '');
                            return;
                        }
                        const sel = q.getSelection();
                        selCount.textContent =
                            sel && sel.length > 0
                                ? `(${sel.length.toLocaleString()}자 선택됨)`
                                : '(선택 없음)';
                    } catch {}
                }
                updateSelectionMeta();
                if (window.quill?.on) {
                    window.quill.on('selection-change', updateSelectionMeta);
                    window.quill.on('text-change', updateSelectionMeta);
                }

                function currentScope() {
                    const r = document.querySelector(
                        '#scDrawer input[name="smScope"]:checked'
                    );
                    return r ? r.value : 'doc';
                }
                function syncCustomWrap() {
                    wrapCustom.hidden = currentScope() !== 'input';
                    if (!wrapCustom.hidden) {
                        setTimeout(() => {
                            document
                                .getElementById('smCustomInput')
                                ?.scrollIntoView({
                                    block: 'start',
                                    behavior: 'smooth',
                                });
                        }, 0);
                    }
                }
                document
                    .querySelectorAll('#scDrawer input[name="smScope"]')
                    .forEach((r) => {
                        r.addEventListener('change', syncCustomWrap);
                    });
                syncCustomWrap();

                function toBullets(txt) {
                    const lines = txt
                        .split(/\r?\n/)
                        .map((s) => s.trim())
                        .filter(Boolean);

                    if (
                        lines.some(
                            (l) =>
                                /^[•\-\*]\s+/.test(l) || /^\d+[\.\)]\s+/.test(l)
                        )
                    ) {
                        return lines
                            .map((l) =>
                                l
                                    .replace(/^[•\-\*]\s+/, '')
                                    .replace(/^\d+[\.\)]\s+/, '')
                            )
                            .map((l) => `• ${l}`)
                            .join('\n');
                    }
                    // 문장으로 나눠 불릿화
                    let s = txt.replace(/([.!?])\s+/g, '$1\n');
                    const parts = s
                        .split('\n')
                        .map((v) => v.trim())
                        .filter(Boolean);
                    return parts.map((p) => `• ${p}`).join('\n');
                }

                btnRun?.addEventListener('click', async () => {
                    const scope = currentScope();
                    const q = window.quill;
                    const format = fmtSel?.value || 'paragraph';
                    const area = $('#smResult');
                    if (area) createInlineSpinner(area, '요약 생성 중…');
                    let text = '';
                    let range = null;

                    if (scope === 'doc') {
                        text = q
                            ? q.getText(0, Math.max(0, q.getLength() - 1))
                            : '';
                        if (!text.trim()) {
                            if (area) removeInlineSpinner(area);
                            if (area) area.textContent = '문서가 비어 있어요.';
                            return;
                        }
                    } else if (scope === 'sel') {
                        if (!q) {
                            if (area) removeInlineSpinner(area);
                            if (area) area.textContent = '에디터가 없어요.';
                            return;
                        }
                        const sel = q.getSelection();
                        if (!sel || sel.length === 0) {
                            if (area) removeInlineSpinner(area);
                            if (area)
                                area.textContent = '선택된 내용이 없어요.';
                            return;
                        }
                        text = q.getText(sel.index, sel.length);
                        range = sel;
                    } else {
                        text = (inputCustom?.value || '').trim();
                        if (!text) {
                            if (area) removeInlineSpinner(area);
                            if (area)
                                area.textContent =
                                    '요약할 텍스트를 입력해 주세요.';
                            return;
                        }
                    }

                    let out = '';
                    try {
                        const r = await postJSON(`${BASE_URL}/summary`, {
                            content: text,
                            format,
                        });
                        out = (r?.result || r?.text || r?.checked || '')
                            .toString()
                            .trim();
                        if (!out) throw new Error('빈 결과');
                    } catch {
                        out =
                            text.slice(0, 160) + (text.length > 160 ? '…' : '');
                    }

                    if (format === 'bullets') {
                        out = toBullets(out);
                    }

                    if (area) removeInlineSpinner(area);
                    if (area) area.textContent = out;
                    btnApply.disabled = btnCopy.disabled = !(out && out.length);

                    $('#smResult')?.scrollIntoView({
                        block: 'start',
                        behavior: 'smooth',
                    });

                    last = {
                        out,
                        scope,
                        rangeSnap: range || null,
                        first: true,
                    };
                });

                btnApply?.addEventListener('click', () => {
                    if (!last?.out) return;
                    const q = window.quill;
                    if (!q) return;

                    const docLen = Math.max(0, q.getLength() - 1);

                    if (last.scope === 'doc' && last.first) {
                        q.setText(last.out);
                        q.setSelection(
                            Math.max(0, last.out.length - 1),
                            0,
                            'silent'
                        );
                        last.first = false;
                        last.rangeSnap = null;
                        return;
                    }

                    const liveSel = q.getSelection(true);
                    const sel =
                        last.first && last.rangeSnap
                            ? last.rangeSnap
                            : liveSel || { index: docLen, length: 0 };

                    if (sel.length > 0) {
                        q.deleteText(sel.index, sel.length, 'user');
                        q.insertText(sel.index, last.out, 'user');
                        q.setSelection(
                            sel.index + last.out.length,
                            0,
                            'silent'
                        );
                    } else {
                        const pos =
                            typeof sel.index === 'number' ? sel.index : docLen;
                        q.insertText(pos, last.out, 'user');
                        q.setSelection(pos + last.out.length, 0, 'silent');
                    }

                    last.first = false;
                    last.rangeSnap = null;
                });

                btnCopy?.addEventListener('click', async () => {
                    const txt = ($('#smResult')?.textContent || '').trim();
                    if (!txt) return;
                    await navigator.clipboard.writeText(txt);
                    const b = btnCopy;
                    b.textContent = '복사됨';
                    setTimeout(() => (b.textContent = '복사'), 1200);
                });

                break;
            }


case 'expand': {
  const $ = (sel) => document.getElementById('scDrawer')?.querySelector(sel);
  const drawer = document.getElementById('scDrawer');
  drawer?.setAttribute('data-panel', 'expand');

  const btnRun   = $('#scExpandRun');
  const btnApply = $('#exApply');
  const btnCopy  = $('#exCopy');

  const selCount    = $('#exSelCount');
  const wrapCustom  = $('#exCustomWrap');
  const inputCustom = $('#exCustomInput');

  // 모드 & 옵션
  const modeWrap    = $('#exModeWrap');
  const lenLevelSel = $('#exLenLevel');   // 'low' | 'medium' | 'high' | 'xhigh'
  const nSent       = $('#exSentences');  // 1~50

  // 길이 레벨
  const LEN_PRESET = { low: 20, medium: 50, high: 80, xhigh: 100 };

  let last = null; 

  // 선택 길이 
  function updateSelectionMeta() {
    try {
      const q = window.quill;
      if (!q) {
        selCount && (selCount.textContent = '');
        return;
      }
      const sel = q.getSelection();
      selCount.textContent =
        sel && sel.length > 0
          ? `(${sel.length.toLocaleString()}자 선택됨)`
          : '(선택 없음)';
    } catch {}
  }
  updateSelectionMeta();
  if (window.quill?.on) {
    window.quill.on('selection-change', updateSelectionMeta);
    window.quill.on('text-change', updateSelectionMeta);
  }


  function currentScope() {
    const r = document.querySelector('#scDrawer input[name="exScope"]:checked');
    return r ? r.value : 'doc'; 
  }
  function syncCustomWrap() {
    const show = currentScope() === 'input';
    if (wrapCustom) wrapCustom.hidden = !show;
    if (show) setTimeout(() => inputCustom?.focus(), 0);
  }
  document
    .querySelectorAll('#scDrawer input[name="exScope"]')
    .forEach((r) => r.addEventListener('change', syncCustomWrap));
  syncCustomWrap();


  function currentMode() {
    const r = document.querySelector('#scDrawer input[name="exMode"]:checked');
    return r ? r.value : 'length'; 
  }
  function setHiddenSafe(el, v) { if (el) el.hidden = !!v; }
  function syncExCtrls() {
    if (!drawer) return;
    const mode = currentMode && currentMode();
    if (!mode) return;

    const lenCtrls  = drawer.querySelectorAll?.('.ex-ctrl--length')    || [];
    const sentCtrls = drawer.querySelectorAll?.('.ex-ctrl--sentences') || [];

   
    lenCtrls.forEach((el)  => setHiddenSafe(el,  mode !== 'length'));
    sentCtrls.forEach((el) => setHiddenSafe(el, mode !== 'sentences'));
  }
  if (modeWrap) modeWrap.addEventListener('change', syncExCtrls);
 
  syncExCtrls();

 
  btnRun?.addEventListener('click', async () => {
    const scope = currentScope();
    const mode  = currentMode();
    const q     = window.quill;
    const area  = $('#exResult');

    if (area) createInlineSpinner(area, '확장 중…');


    let text   = '';
    let range  = null;        
    let insertPos = null;      

    if (scope === 'doc') {
      text = q ? q.getText(0, Math.max(0, q.getLength() - 1)) : '';
      if (!text.trim()) {
        if (area) removeInlineSpinner(area);
        if (area) area.textContent = '문서가 비어 있어요.';
        return;
      }
     
      insertPos = q ? (q.getLength() - 1) : 0;

    } else if (scope === 'sel') {
      if (!q) {
        if (area) removeInlineSpinner(area);
        if (area) area.textContent = '에디터가 없어요.';
        return;
      }
      const sel = q.getSelection();
      if (!sel || sel.length === 0) {
        if (area) removeInlineSpinner(area);
        if (area) area.textContent = '선택된 내용이 없어요.';
        return;
      }
      text  = q.getText(sel.index, sel.length);
      range = sel;
      // 선택 뒤에 추가
      insertPos = sel.index + sel.length;

    } else { 
      text = (inputCustom?.value || '').trim();
      if (!text) {
        if (area) removeInlineSpinner(area);
        if (area) area.textContent = '확장할 텍스트를 입력해 주세요.';
        return;
      }
    
      insertPos = null;
    }

    try {
      
      if (mode === 'length') {
      
        const levelKey = lenLevelSel?.value || 'medium';
        const payload = {
          content: text,
          mode: 'length',
          length_level: levelKey
        };
        const r = await postJSON(`${BASE_URL}/expand`, payload);
        const out = (r?.result || r?.text || '').toString().trim();
        if (!out) {
          if (area) removeInlineSpinner(area);
          if (area) area.textContent = '빈 결과입니다.';
          return;
        }

        if (area) removeInlineSpinner(area);
        if (area) area.textContent = out;

if (btnApply) {
  
  btnApply.onclick = null;

  btnApply.onclick = () => {
    const qq = window.quill;
    if (!qq) return;

    try { qq.focus(); } catch {}
    let live = null;
    try { live = qq.getSelection(true); } catch {}


    const once = btnApply.dataset.once === '1';


    const textToInsert = out || '';
    if (!textToInsert) return;

   
    const hasLiveSel = !!(live && typeof live.index === 'number');
    const hasRange    = hasLiveSel && (live.length > 0);

   
    try {
      if (!once) {
        if (scope === 'doc') {
      
          qq.setText(textToInsert);
          qq.setSelection(Math.max(0, textToInsert.length - 1), 0, 'silent');
          btnApply.dataset.once = '1'; // 
          return;
        }
        if (scope === 'sel' && hasRange) {
    
          const idx   = live.index;
          const len   = live.length;
          const attrs = qq.getFormat(Math.max(0, idx - 1), 1);
          qq.deleteText(idx, len, 'user');
          qq.insertText(idx, textToInsert, attrs, 'user');
          qq.setSelection(idx + textToInsert.length, 0, 'silent');
          btnApply.dataset.once = '1';
          return;
        }
       
      }

     
      let pos = 0;
      if (hasLiveSel) {
        
        pos = live.index + (live.length || 0);
      } else {
       
        pos = Math.max(0, qq.getLength() - 1);
      }
      const attrs = qq.getFormat(Math.max(0, pos - 1), 1);
      qq.insertText(pos, textToInsert, attrs, 'user');
      qq.setSelection(pos + textToInsert.length, 0, 'silent');
      btnApply.dataset.once = '1';
    } catch (e) {
      
      try { console.warn('[apply length] failed:', e); } catch {}
    }
  };
}


        // 적용/복사 
        if (btnApply) btnApply.disabled = !(out && out.length);
        if (btnCopy)  btnCopy.disabled  = !(out && out.length);

      } else {
       
        const addN = Math.max(1, Math.min(50, parseInt(nSent?.value || '1', 10)));

        let before = '';
        let after  = '';
        if (scope === 'input') {
          before = text; 
          after  = '';
        } else if (q) {
          const pos = Number.isFinite(insertPos) ? insertPos : (q.getSelection(true)?.index ?? (q.getLength() - 1));
          before = q.getText(0, pos);
          
          const tailLen = Math.max(0, q.getLength() - 1 - pos);
          after  = q.getText(pos, tailLen);
        }

        
        const r = await postJSON(`${BASE_URL}/promptAdd`, {
          before,
          after,
          prompt: `이 위치에 ${addN}문장을 자연스럽게 덧붙여 주세요.`
        });

        const onlyAdded = (r?.result || r?.text || '').toString().trim();
        if (!onlyAdded) {
          if (area) removeInlineSpinner(area);
          if (area) area.textContent = '빈 결과입니다.';
          return;
        }

        if (area) removeInlineSpinner(area);
        if (area) area.textContent = onlyAdded;

        if (btnApply) btnApply.disabled = false;
        if (btnCopy)  btnCopy.disabled  = false;

        
        btnApply && (btnApply.onclick = () => {
          try {
            const qq = window.quill;
            if (!qq) return;
            let pos;
            if (scope === 'doc') {
              pos = qq.getLength() - 1; 
            } else if (scope === 'sel') {
              pos = range ? (range.index + range.length) : (qq.getSelection(true)?.index ?? (qq.getLength() - 1));
            } else {
              
              return;
            }
            const attrs = qq.getFormat(Math.max(0, pos - 1), 1);
            qq.insertText(pos, onlyAdded, attrs, 'user');
            qq.setSelection(pos + onlyAdded.length, 0, 'silent');
          } catch {}
        });
      }

      // 복사
      btnCopy && (btnCopy.onclick = async () => {
        try {
          const txt = $('#exResult')?.textContent || '';
          await navigator.clipboard?.writeText(txt);
          const b = btnCopy;
          b.textContent = '복사됨';
          setTimeout(() => (b.textContent = '복사'), 1200);
        } catch {}
      });

     
      if (scope === 'input') {
        document.getElementById('exResult')?.scrollIntoView({
          block: 'start', behavior: 'smooth',
        });
      }

      last = { out: ($('#exResult')?.textContent || ''), scope, rangeSnap: range, first: true };

    } catch (err) {
      if (area) removeInlineSpinner(area);
      if (area) area.textContent = '요청 중 오류가 발생했습니다.';
      console.error(err);
    }
  });

  break;
}


            case 'grammar': {
                const $ = (sel) =>
                    document.getElementById('scDrawer')?.querySelector(sel);

                const drawer = document.getElementById('scDrawer');
                drawer?.setAttribute('data-panel', 'grammar');

                const btnRun = $('#scGrammarRun');
                const btnApply = $('#grApply');
                const btnCopy = $('#grCopy');

                const wrapCustom = $('#grCustomWrap');
                const inputCustom = $('#grCustomInput');
                const lenHint = $('#grLenHint');
                const selCount = $('#grSelCount');

                let last = null;

                function updateSelectionMeta() {
                    try {
                        const q = window.quill;
                        if (!q) {
                            selCount && (selCount.textContent = '');
                            return;
                        }
                        const sel = q.getSelection();
                        selCount.textContent =
                            sel && sel.length > 0
                                ? `(${sel.length.toLocaleString()}자 선택됨)`
                                : '(선택 없음)';
                    } catch {}
                }
                updateSelectionMeta();
                if (window.quill?.on) {
                    window.quill.on('selection-change', updateSelectionMeta);
                    window.quill.on('text-change', updateSelectionMeta);
                }

                function currentScope() {
                    const r = document.querySelector(
                        '#scDrawer input[name="grScope"]:checked'
                    );
                    return r ? r.value : 'doc';
                }
                function syncCustomWrap() {
                    const show = currentScope() === 'input';
                    wrapCustom.hidden = !show;
                    if (show) {
                        setTimeout(() => {
                            inputCustom?.focus();
                            inputCustom?.scrollIntoView({
                                block: 'start',
                                behavior: 'smooth',
                            });
                        }, 0);
                    }
                }
                document
                    .querySelectorAll('#scDrawer input[name="grScope"]')
                    .forEach((r) => {
                        r.addEventListener('change', syncCustomWrap);
                    });
                syncCustomWrap();

                inputCustom?.addEventListener('input', () => {
                    const n = (inputCustom.value || '').length;
                    if (lenHint)
                        lenHint.textContent = `${n.toLocaleString()} / 300자`;
                    if (n > 300) lenHint.style.color = '#ef4444';
                    else lenHint.style.color = '';
                });

                // 실행
                btnRun?.addEventListener('click', async () => {
                    const scope = currentScope();
                    const q = window.quill;
                    const area = $('#grResult');
                    if (area) createInlineSpinner(area, '교정 중…');

                    let text = '';
                    let range = null;

                    if (scope === 'doc') {
                        text = q
                            ? q.getText(0, Math.max(0, q.getLength() - 1))
                            : '';
                    } else if (scope === 'sel') {
                        if (!q) {
                            $('#grResult').textContent = '에디터가 없어요.';
                            return;
                        }
                        const sel = q.getSelection();
                        if (!sel || sel.length === 0) {
                            $('#grResult').textContent =
                                '선택된 내용이 없어요.';
                            return;
                        }
                        text = q.getText(sel.index, sel.length);
                        range = sel;
                    } else {
                        text = (inputCustom?.value || '').trim();
                        if (!text) {
                            $('#grResult').textContent =
                                '교정할 텍스트를 입력해 주세요.';
                            return;
                        }
                    }

                    const len = (text || '').length;
                    if (len >= 300) {
                        if (area) removeInlineSpinner(area);
                        if (area)
                            area.textContent =
                                '⚠️ 300자 미만으로 선택하거나 직접 입력해 주세요.';
                        return;
                    }

                    // 호출
                    btnApply.disabled = btnCopy.disabled = true;
                    try {
                        const r = await postJSON(`${BASE_URL}/editorGrammar`, {
                            content: text,
                        });
                        const out = (r?.checked ?? r?.result ?? r?.text ?? '')
                            .toString()
                            .trim();
                        if (!out) {
                            if (area) removeInlineSpinner(area);
                            if (area) area.textContent = '빈 결과입니다.';
                            return;
                        }

                        if (area) removeInlineSpinner(area);
                        if (area) area.textContent = out;
                        btnApply.disabled = btnCopy.disabled = !(
                            out && out.length
                        );

                        if (scope === 'input') {
                            document
                                .getElementById('grResult')
                                ?.scrollIntoView({
                                    block: 'start',
                                    behavior: 'smooth',
                                });
                        }

                        last = {
                            out,
                            scope,
                            rangeSnap: range || null,
                            first: true,
                        };
                    } catch (e) {
                        if (area) removeInlineSpinner(area);
                        if (area)
                            area.textContent =
                                '문법 교정 실패: ' + (e?.message || e);
                    }
                });

                // 적용
                btnApply?.addEventListener('click', () => {
                    if (!last?.out) return;
                    const q = window.quill;
                    if (!q) return;

                    const docLen = Math.max(0, q.getLength() - 1);

                    if (last.scope === 'doc' && last.first) {
                        q.setText(last.out);
                        q.setSelection(
                            Math.max(0, last.out.length - 1),
                            0,
                            'silent'
                        );
                        last.first = false;
                        last.rangeSnap = null;
                        return;
                    }

                    const liveSel = q.getSelection(true);
                    const sel =
                        last.first && last.rangeSnap
                            ? last.rangeSnap
                            : liveSel || { index: docLen, length: 0 };

                    if (sel.length > 0) {
                        q.deleteText(sel.index, sel.length, 'user');
                        q.insertText(sel.index, last.out, 'user');
                        q.setSelection(
                            sel.index + last.out.length,
                            0,
                            'silent'
                        );
                    } else {
                        const pos =
                            typeof sel.index === 'number' ? sel.index : docLen;
                        q.insertText(pos, last.out, 'user');
                        q.setSelection(pos + last.out.length, 0, 'silent');
                    }

                    last.first = false;
                    last.rangeSnap = null;
                });

                // 복사
                btnCopy?.addEventListener('click', async () => {
                    const txt = ($('#grResult')?.textContent || '').trim();
                    if (!txt) return;
                    await navigator.clipboard.writeText(txt);
                    const b = btnCopy;
                    b.textContent = '복사됨';
                    setTimeout(() => (b.textContent = '복사'), 1200);
                });

                break;
            }
        }
    }

    // 5) 아이콘 클릭 → 패널 열기
    if (dock) {
        dock.addEventListener('click', (e) => {
            const btn = e.target.closest('.sc-dock__btn');
            if (!btn) return;
            openPanel(btn.dataset.action || 'prompt');
        });
    }

    (() => {
        const $ = (sel) => document.querySelector(sel);
        const getIconHTML = (action) =>
            $(`.sc-dock__btn[data-action="${action}"] .sc-icon`)?.innerHTML ||
            '';
        const setIconHTML = (action, svg) => {
            const el = $(`.sc-dock__btn[data-action="${action}"] .sc-icon`);
            if (el) el.innerHTML = svg;
        };

        const ic = (paths, w = 1.8) =>
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="${w}"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

        const SVG = {
            globe: ic(`
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10"/>
    `),
            sparkles: ic(`
      <path d="M12 3v4"/><path d="M12 17v4"/>
      <path d="M3 12h4"/><path d="M17 12h4"/>
      <path d="m19.8 5.2-2.8 2.8"/><path d="m7 17-2.8 2.8"/>
      <path d="m5.2 5.2 2.8 2.8"/><path d="m17 17 2.8 2.8"/>
    `),
            message: ic(`
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
    `),
            shrink: ic(`
      <path d="M15 15h6v6"/><path d="M9 9H3V3"/>
      <path d="M21 15l-6 6"/><path d="M3 9l6-6"/>
    `),
        };

        const originalTranslate = getIconHTML('translate');
        const originalExpand = getIconHTML('expand');

        if (originalExpand) setIconHTML('summary', originalExpand);

        setIconHTML('expand', SVG.shrink);

        setIconHTML('translate', SVG.globe);

        if (originalTranslate) setIconHTML('rewrite', originalTranslate);

        setIconHTML('style', SVG.sparkles);

        setIconHTML('informal', SVG.message);
    })();

    // === Dock 아이콘 교체 ===
    (function applyDockIcons() {
        const q = (sel) => document.querySelector(sel);

        const oldTranslateSVG =
            q('.sc-dock__btn[data-action="translate"] svg')?.outerHTML || '';
        const oldExpandSVG =
            q('.sc-dock__btn[data-action="expand"] svg')?.outerHTML || '';

        const ICON = {
            globe: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M3 12h18"/>
        <path d="M12 3a15 15 0 0 0 0 18M12 3a15 15 0 0 1 0 18"/>
      </svg>`,

            wand: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 21l9-9"/>
        <path d="M14 6l4 4M12 8l4 4"/>
        <rect x="13" y="3" width="6" height="2" rx="1" transform="rotate(45 13 3)"/>
      </svg>`,

            expandOut: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <!-- 중심에서 네 모서리로 뻗는 선 -->
        <line x1="12" y1="12" x2="3"  y2="3"  />
        <line x1="12" y1="12" x2="21" y2="3"  />
        <line x1="12" y1="12" x2="3"  y2="21" />
        <line x1="12" y1="12" x2="21" y2="21" />
        <!-- 모서리 L 가이드 (방향감을 강조) -->
        <polyline points="9 3, 3 3, 3 9"/>
        <polyline points="15 21, 21 21, 21 15"/>
        <polyline points="15 3, 21 3, 21 9"/>
        <polyline points="9 21, 3 21, 3 15"/>
      </svg>`,

            face: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M9 10h.01M15 10h.01"/>
        <path d="M8 15s2 2 4 2 4-2 4-2"/>
      </svg>`,
        };
        // 3) 교체 유틸
        const setSVG = (action, svg) => {
            const btn = q(`.sc-dock__btn[data-action="${action}"]`);
            if (!btn) return;
            const cur = btn.querySelector('svg');
            if (cur) cur.outerHTML = svg;
            else btn.insertAdjacentHTML('afterbegin', svg);
        };

        // 4) 요구사항 매핑

        setSVG('translate', ICON.globe);

        setSVG('style', ICON.wand);

        if (oldExpandSVG) setSVG('summary', oldExpandSVG);

        setSVG('expand', ICON.expandOut);

        setSVG('informal', ICON.face);

        if (oldTranslateSVG) setSVG('rewrite', oldTranslateSVG);
    })();

    // 6) 닫기 이벤트
    closeBtn?.addEventListener('click', closePanel);
    backdrop?.addEventListener('click', closePanel);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePanel();
    });

    // 7) 콘솔 디버그 오픈
    window.DEBUG_OPEN_DRAWER = (key = 'summary') => {
        openPanel(key);
        const drawer = document.getElementById('scDrawer');
        const wrap = document.querySelector('.wrap');
        return {
            key,
            opened: !!drawer?.classList.contains('open'),
            inWrap: drawer?.parentElement === wrap,
        };
    };
})();

const menu = document.getElementById('customContextMenu');
const styleSubmenu = document.getElementById('styleSubmenu');
const translateSubmenu = document.getElementById('translateSubmenu');
// 페이지 전체에 한 번만 등록
document.addEventListener('contextmenu', (e) => {
    const quill2 = document.getElementById('quill2');

    // quill2가 열려 있고, 그 안에서 우클릭한 경우에만 작동
    if (quill2 && quill2.contains(e.target)) {
        e.preventDefault();

        // 커스텀 메뉴 위치 조정
        menu.style.top = `${e.pageY}px`;
        menu.style.left = `${e.pageX}px`;
        menu.hidden = false;
        styleSubmenu.hidden = true; // 문체 변경 서브메뉴 초기화
        translateSubmenu.hidden = true;
    } else {
        // 다른 곳 클릭 시 메뉴 숨김
        menu.hidden = true;
        styleSubmenu.hidden = true;
        translateSubmenu.hidden = true;
    }
});

// 클릭하면 메뉴 닫기
document.addEventListener('click', () => {
    menu.hidden = true;
    styleSubmenu.hidden = true;
    translateSubmenu.hidden = true;
});

// 메뉴 클릭 동작 정의
menu.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;
    const { text, apply } = getQuillSelectionOrAll2();
    const content = (text || '').trim();

    if (!content) {
        alert('내용을 입력하세요.');
        return;
    }

    if (!action) return;

    switch (action) {
        case 'summary':
            console.log('요약 기능 실행');
            spin(true);

            try {
                const data = await postJSON(`${BASE_URL}/summary`, {
                    content,
                });
                const out = (
                    data?.result ??
                    data?.text ??
                    data?.checked ??
                    data?.styled_text ??
                    data?.translated ??
                    ''
                ).trim();
                if (!out) throw new Error('빈 결과');
                apply(out);
            } catch (e) {
                alert('요약 실패: ' + e.message);
            } finally {
                console.log('텍스트 추출 모달에서 요약 완료');
                spin(false);
            }
            break;
        case 'expand':
            console.log('확장 기능 실행');
            spin(true);

            try {
                const data = await postJSON(`${BASE_URL}/expand`, {
                    content,
                });
                const out = (
                    data?.result ??
                    data?.text ??
                    data?.checked ??
                    data?.styled_text ??
                    data?.translated ??
                    ''
                ).trim();
                if (!out) throw new Error('빈 결과');
                apply(out);
            } catch (e) {
                alert('확장 실패: ' + e.message);
            } finally {
                console.log('텍스트 추출 모달에서 확장 완료');
                spin(false);
            }
            break;
        case 'rewrite':
            console.log('재작성 실행');
            spin(true);

            try {
                const data = await postJSON(`${BASE_URL}/mistralRewrite`, {
                    content,
                });
                const out = (
                    data?.result ??
                    data?.text ??
                    data?.styled_text ??
                    data?.checked ??
                    data?.translated ??
                    ''
                ).trim();
                if (!out) throw new Error('빈 결과');

                apply(out);
            } catch (e) {
                alert('재작성 실패: ' + e.message);
            } finally {
                console.log('텍스트 추출 모달에서 재작성 완료');
                spin(false);
            }
            break;
        case 'honorific':
            console.log('높임말 실행');
            spin(true);

            try {
                const data = await postJSON(`${BASE_URL}/cohereHonorific`, {
                    content,
                });
                const out = (
                    data?.result ??
                    data?.text ??
                    data?.checked ??
                    data?.styled_text ??
                    data?.translated ??
                    ''
                ).trim();
                if (!out) throw new Error('빈 결과');
                apply(out);
            } catch (e) {
                alert('높임말 변환 실패: ' + e.message);
            } finally {
                console.log('텍스트 추출 모달에서 높임말 완료');
                spin(false);
            }
            break;
        case 'informal':
            console.log('반말 실행');
            spin(true);

            try {
                const data = await postJSON(`${BASE_URL}/cohereInformal`, {
                    content,
                });
                const out = (
                    data?.result ??
                    data?.text ??
                    data?.checked ??
                    data?.styled_text ??
                    data?.translated ??
                    ''
                ).trim();
                if (!out) throw new Error('빈 결과');
                apply(out);
            } catch (e) {
                alert('반말 변환 실패: ' + e.message);
            } finally {
                console.log('텍스트 추출 모달에서 반말 완료');
                spin(false);
            }
            break;
        case 'grammar':
            console.log('문법 교정 실행');
            spin(true);

            if (content.length >= 300) {
                alert(
                    '글자 수가 300자를 초과했습니다. 300자 미만으로 써주십시오.'
                );
                return;
            }
            try {
                const data = await postJSON(`${BASE_URL}/editorGrammar`, {
                    content,
                });

                const out = (
                    data?.checked ??
                    data?.result ??
                    data?.text ??
                    ''
                ).trim();
                if (!out) throw new Error('빈 결과');

                apply(out);
                console.log('교정된 결과: ', data.checked);
            } catch (e) {
                alert('문법 교정 실패: ' + e.message);
            } finally {
                console.log('텍스트 추출 모달에서 문법 교정 완료');
                spin(false);
            }
            break;
    }

    // 메뉴 닫기
    e.currentTarget.hidden = true;
});

// 마우스 오버 시 서브메뉴 표시
menu.addEventListener('mouseover', (e) => {
    const target = e.target;

    // 문체 변경 서브메뉴
    if (target.dataset.action === 'style') {
        const rect = target.getBoundingClientRect();
        styleSubmenu.style.top = `${rect.top}px`;
        styleSubmenu.style.left = `${rect.right + 4}px`;
        styleSubmenu.hidden = false;
        translateSubmenu.hidden = true;
    }
    // 번역 서브메뉴
    else if (target.dataset.action === 'translate') {
        const rect = target.getBoundingClientRect();
        translateSubmenu.style.top = `${rect.top}px`;
        translateSubmenu.style.left = `${rect.right + 4}px`;
        translateSubmenu.hidden = false;
        styleSubmenu.hidden = true;
    } else if (
        !styleSubmenu.contains(target) &&
        !translateSubmenu.contains(target)
    ) {
        styleSubmenu.hidden = true;
        translateSubmenu.hidden = true;
    }
});

// 문체 변경 서브메뉴 클릭 동작
styleSubmenu.addEventListener('click', async (e) => {
    const subaction = e.target.dataset.subaction;
    if (!subaction) return;
    console.log(`문체 변경 → ${subaction} 실행`);
    spin(true);
    const { text, apply } = getQuillSelectionOrAll2();
    const content = (text || '').trim();

    if (!content) {
        alert('내용을 입력하세요.');
        return;
    }

    try {
        const data = await postJSON(`${BASE_URL}/gptStyleChange`, {
            text: content,
            style: subaction, // ✅ 클릭된 data-subaction 전달
        });

        const out = (
            data?.result ??
            data?.text ??
            data?.checked ??
            data?.styled_text ??
            data?.translated ??
            ''
        ).trim();

        if (!out) throw new Error('빈 결과');
        apply(out);
        console.log(`문체변경 ${subaction} 완료`);
    } catch (e) {
        alert('문체변경 실패: ' + e.message);
    } finally {
        menu.hidden = true;
        styleSubmenu.hidden = true;
        spin(false);
    }
});

// 번역 서브메뉴 클릭 동작
translateSubmenu.addEventListener('click', async (e) => {
    const lang = e.target.dataset.subaction;
    if (!lang) return;

    const { text, apply } = getQuillSelectionOrAll2();
    const content = (text || '').trim();
    if (!content) return alert('내용을 입력하세요.');
    spin(true);

    try {
        const data = await postJSON(`${BASE_URL}/translate`, {
            text: content,
            source: 'auto',
            target: lang, // ✅ 선택된 언어 코드 전달
        });
        const out = (
            data?.result ??
            data?.text ??
            data?.checked ??
            data?.styled_text ??
            data?.translated ??
            ''
        ).trim();
        if (!out) throw new Error('빈 결과');
        apply(out);
    } catch (e) {
        alert('번역 실패: ' + e.message);
    } finally {
        menu.hidden = true;
        translateSubmenu.hidden = true;
        spin(false);
    }
});

//이미지 삽입 관련
function ensureImagePicker() {
    let inp = document.getElementById('__imgInsertPicker');
    if (!inp) {
        inp = document.createElement('input');
        inp.type = 'file';
        inp.id = '__imgInsertPicker';
        inp.accept = 'image/*';

        Object.assign(inp.style, {
            position: 'fixed',
            left: '-10000px',
            top: '-10000px',
            width: '1px',
            height: '1px',
            opacity: '0',
            pointerEvents: 'auto',
        });
        document.body.appendChild(inp);
    }
    return inp;
}

async function fileToDataURLCompressed(file, opt = {}) {
    const { maxW = 1600, maxH = 1600, quality = 0.9 } = opt;

    // GIF(애니메이션 보존): 그대로 DataURL
    if (/^image\/gif$/i.test(file.type)) {
        return new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result);
            fr.onerror = rej;
            fr.readAsDataURL(file);
        });
    }

    const srcURL = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(file);
    });

    const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = srcURL;
    });

    // 캔버스 리사이즈
    let { width: w, height: h } = img;
    const ratio = Math.min(maxW / w, maxH / h, 1);
    const dw = Math.round(w * ratio);
    const dh = Math.round(h * ratio);

    const cvs = document.createElement('canvas');
    cvs.width = dw;
    cvs.height = dh;
    const ctx = cvs.getContext('2d');
    ctx.drawImage(img, 0, 0, dw, dh);

    // PNG는 투명도 보존, 그 외는 JPEG로 경량화
    const isPng = /^image\/png$/i.test(file.type);
    return cvs.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality);
}

async function editorPdfDownload() {
    if (!window.quill) return alert('에디터가 아직 준비되지 않았어요.');
    const content = quill.root;
    html2pdf()
        .set({
            margin: 10,
            filename: 'Editor PDF.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
            },
        })
        .from(content)
        .save();
}

const info = document.getElementById('speechInfo');
let tooltip;

info.addEventListener('mouseenter', (e) => {
    const text = info.getAttribute('data-tip');
    if (!text) return;

    tooltip = document.createElement('div');
    tooltip.className = 'tooltip-floating';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);

    // 아이콘 위치 계산
    const rect = info.getBoundingClientRect();
    const top = rect.bottom + 8; // 아래쪽 8px 띄움
    const left = rect.left + rect.width / 2;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    requestAnimationFrame(() => {
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translate(-50%, 4px)';
    });
});

info.addEventListener('mouseleave', () => {
    if (tooltip) {
        tooltip.style.opacity = '0';
        tooltip.remove();
        tooltip = null;
    }
});
// 파일 속 이미지 추출
function renderScanResult(mergedText) {
    const area = document.getElementById('resultArea');
    if (!area) return;
    area.innerHTML = `
  <pre style="white-space: pre-wrap; word-break: break-word; margin:0;">
    ${escapeHtml(text)}
  </pre>
`;

    const raw = (mergedText || '').toString();
    // 개행 변형까지 커버하는 분리
    const markerRe = /\n*\[📷 이미지 OCR\]\n*/;
    const parts = raw.split(markerRe);
    const bodyText = (parts[0] || '').trim();
    const imgText = (parts[1] || '').trim();

    const sec = (title, text) => `
    <section class="sc-block">
      <h3 style="margin:12px 0 8px;">${title}</h3>
      <pre style="white-space:pre-wrap;word-break:break-word;margin:0;">${escapeHtml(
          text
      )}</pre>
    </section>`;

    if (bodyText)
        area.insertAdjacentHTML('beforeend', sec('본문 텍스트', bodyText));
    if (imgText)
        area.insertAdjacentHTML('beforeend', sec('📷 이미지 OCR', imgText));
    if (!bodyText && !imgText)
        area.textContent = '텍스트를 추출하지 못했습니다.';

    // 디버그(배포 때 일시적으로 켜 두면 좋음)
    console.debug('[fileScan:text]', raw.slice(0, 400));
}

function escapeHtml(s) {
    return (s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 파일 업로드 시 자동 추출 & 렌더
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('fileAny');
    const spinner = document.getElementById('loadingSpinner');
    const area = document.getElementById('resultArea');
    if (!input || !area) return;

    input.addEventListener('change', async () => {
        const file = getSelectedFile && getSelectedFile();
        if (!file) return;

        // 스피너 ON
        if (spinner) spinner.style.display = 'block';
        area.innerHTML = '';

        try {
            let text;
            if (isImageFile && isImageFile(file)) {
                // 이미지 단일 파일은 visionOCR 사용
                const fd = new FormData();
                fd.append('image', file);
                const res = await fetch(`${BASE_URL}/visionOCR`, {
                    method: 'POST',
                    body: fd,
                });
                if (!res.ok) throw new Error('visionOCR 실패: ' + res.status);
                const js = await res.json();
                text = (js.text || js.result || '').toString();
            } else {
                // 문서 계열은 /fileScan (본문 + 이미지OCR 합쳐 내려옴)
                text = await extractTextFromAnyFile(file); // 이미 구현됨
            }
            window.lastExtractedText = text;
            renderScanResult(text);
        } catch (e) {
            console.error(e);
            area.textContent = '❗ 처리 중 오류가 발생했습니다.';
        } finally {
            if (spinner) spinner.style.display = 'none';
        }
    });
});
