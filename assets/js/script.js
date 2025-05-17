// DOMContentLoaded 이벤트를 사용하여 DOM이 완전히 로드된 이후에 document.getElementById로 요소를 찾도록 수정
document.addEventListener('DOMContentLoaded', () => {
    // 버튼 클릭 이벤트 바인딩
    const rewriteBtn = document.getElementById('rewriteBtn');
    if (rewriteBtn) {
        rewriteBtn.addEventListener('click', mistralRewrite);
    }

    const grammarBtn = document.getElementById('grammarBtn');
    if (grammarBtn) {
        grammarBtn.addEventListener('click', mistralGrammar);
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

});

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

async function loadMoreExamples() {
    const userInput = document.getElementById('userInput').value.trim();
    const container = document.getElementById('exampleContainer');
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block'; 

    if (!userInput) {
        alert('입력된 문장이 없습니다.');
        return;
    }

    if (exampleOffset === 0) {
        currentInput = userInput; // 첫 요청 시 저장
        container.innerHTML = ''; // 초기화
    }

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/searchExample', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: currentInput,
                offset: exampleOffset,
            }),
        });

        const data = await response.json();

        if (data.examples) {
            const examples = data.examples
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
    copyBtn.style.display = 'inline';  // 핵심: 인라인으로 붙이기

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
                pdfBtn.onclick = function () {
                    const content =
                        document.getElementById('exampleContainer').innerText;
                    html2pdf(content);
                };
            }
        } else {
            container.innerText = '예문을 불러오지 못했습니다.';
        }
    } catch (error) {
        console.error('예문 요청 오류:', error);
        alert('❗ 예문 불러오기 중 오류 발생');
    } finally {
        spinner.style.display = 'none';
    }
}

async function mistralRewrite() {
    const userInput = document.getElementById('userInput').value;
    const originalText = userInput;
    const resultArea = document.getElementById('resultArea');
    // resultArea.innerHTML = ''; // HTML 내용을 지움
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';


    if (!userInput.trim()) {
        alert('입력된 문장이 없습니다.');
        return;
    }

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/mistralRewrite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: userInput }),
        });

        const data = await response.json();

        resultArea.innerHTML = '';

        const examples = data.result
            .split(/예시문 \d+:/)
            .map((text) => text.trim())
            .filter((text) => text.length > 0);
        examples.forEach((text, idx) => {
            const exampleId = `example${idx + 1}`;
            const wrapper = document.createElement('div');
            wrapper.id = `${exampleId}-wrapper`;

            const label = document.createElement('div');
            label.innerText = `예시문 ${idx + 1}:`;

            const content = document.createElement('p');
            content.id = exampleId;
            content.innerHTML = highlightDiffWithType(originalText, text);

            wrapper.appendChild(label);
            wrapper.appendChild(content);

            wrapper.style.marginBottom = '20px';

            resultArea.appendChild(wrapper);

            document
                .getElementById('pdfDownloadBtn')
                .addEventListener('click', function () {
                    html2pdf(wrapper); // 이 방법으로 HTML을 PDF로 변환
                });
        });
    } catch (error) {
        console.error('Fetch error:', error);
        alert('❗요청 중 오류가 발생했습니다.');
    } finally {
      spinner.style.display = 'none';
    }
}

async function changeStyle(exampleId) {
    const selectedText = document.getElementById(exampleId).innerText.trim();
    const styleRaw = document.getElementById(`${exampleId}-style`).value;
    const style = styleRaw.toLowerCase();
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';

    console.log('🛠 스타일 적용 요청:', { selectedText, style });

    if (!selectedText) {
        alert('선택된 예시문이 비어있습니다.');
        return;
    }

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/gptStyleChange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: selectedText, style: style }),
        });

        const data = await response.json();
        if (data.styled_text) {
            document.getElementById(exampleId).innerText = data.styled_text;
        } else {
            alert('스타일 변환 실패: ' + (data.error || '알 수 없는 오류'));
        }
        document
            .getElementById('pdfDownloadBtn')
            .addEventListener('click', function () {
                html2pdf(data.styled_text); // 이 방법으로 HTML을 PDF로 변환
            });
    } catch (error) {
        console.error('스타일 변경 중 오류:', error);
        alert('❗스타일 변경 요청 중 오류가 발생했습니다.');
    } finally {
        spinner.style.display = 'none';
    }
}

async function summarizeText() {
    const userInput = document.getElementById('userInput').value;
    const resultArea = document.getElementById('resultArea');
    resultArea.innerHTML = '';
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';

    if (!userInput.trim()) {
        alert('입력된 문장이 없습니다.');
        return;
    }

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: userInput }),
        });

        const data = await response.json();
        if (data.result) {
            resultArea.innerHTML = `
              <h5>📚 요약 결과:</h5>
              <p style="white-space: pre-wrap;">${data.result}</p>
            `;
        } else {
            resultArea.innerText = `⚠️ 요약 실패: ${
                data.error || '알 수 없는 오류'
            }`;
        }
    } catch (error) {
        console.error('요약 요청 중 오류:', error);
        resultArea.innerText = '❗요약 요청 중 오류가 발생했습니다.';
    } finally {
        spinner.style.display = 'none';
    }
}

async function expandText() {
    const userInput = document.getElementById('userInput').value;
    const resultArea = document.getElementById('resultArea');
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';


    resultArea.innerHTML = '';

    if (!userInput.trim()) {
        alert('입력된 문장이 없습니다.');
        return;
    }

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/expand', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: userInput }),
        });

        const data = await response.json();
        if (data.result) {
            resultArea.innerHTML = `
              <h5>🚀 확장 결과:</h5>
              <p style="white-space: pre-wrap;">${data.result}</p>
            `;
        } else {
            resultArea.innerText = `⚠️ 확장 실패: ${
                data.error || '알 수 없는 오류'
            }`;
        }
    } catch (error) {
        console.error('확장 요청 중 오류:', error);
        resultArea.innerText = '❗확장 요청 중 오류가 발생했습니다.';
    } finally {
        spinner.style.display = 'none';
    }
}

async function mistralGrammar() {
    const userInput = document.getElementById('userInput').value;
    const resultArea = document.getElementById('resultArea');
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';

    const tbody = document.querySelector('tbody');
    if (!tbody) {
        console.log('⚠️ tbody 요소가 없습니다. HTML 구조를 확인하세요.');
        return;
    }
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }

    if (!userInput.trim()) {
        alert('입력된 문장이 없습니다.');
        return;
    }

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/mistralGrammar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: userInput }),
        });

        const data = await response.json();
        const text = data.result;

        if (text) {
            const lines = text
                .split(/\n+/)
                .map((line) => line.trim())
                .filter((line) => line.length > 0); // 여기서 빈 줄 제거됨

            const table = document.getElementById('grammarTable');

            function removeIcons(text) {
                // 이모지 제거
                return text.replace(/^[^\w가-힣]+/, '').trim();
            }

            let hasError = false; // 틀린 문장이 하나라도 발견되었음을 기록

            for (let i = 0; i < lines.length; i += 4) {
                const cleanLine1 = removeIcons(lines[i]);
                const cleanLine2 = removeIcons(lines[i + 1]);

                if (cleanLine1 === cleanLine2) {
                    // 맞는 문장이면 기록하지 않고 넘어감
                    continue;
                }

                hasError = true;

                const row = document.createElement('tr');

                const tdLeft = document.createElement('td');
                const tdRight = document.createElement('td');
                tdRight.classList.add('right');

                // ❌문장 vs ✅문장 비교 및 하이라이트
                const [highlightedWrong, highlightedCorrect] =
                    highlightDifference(lines[i], lines[i + 1]);

                // 하이라이트된 결과를 tdLeft에 innerHTML로 삽입
                tdLeft.innerHTML = `
                    <div class="sentence"> ${highlightedWrong}</div>
                    <div class="sentence"> ${highlightedCorrect}</div>
                `;

                // tdRight는 기존처럼 규칙 설명 출력
                tdRight.textContent = lines[i + 2] + '\n' + lines[i + 3];

                row.appendChild(tdLeft);
                row.appendChild(tdRight);
                tbody.appendChild(row);
            }

            if (!hasError) {
                alert('🎉 틀린 부분이 없습니다.');
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
        console.error('Fetch error:', error);
    } finally {
        spinner.style.display = 'none';
    }
}

async function cohereHonorific() {
    const userInput = document.getElementById('userInput').value;
    const resultArea = document.getElementById('resultArea');
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';
    resultArea.innerHTML = ''; // HTML 내용을 지움

    if (!userInput.trim()) {
        resultArea.innerText = '입력된 문장이 없습니다.';
        return;
    }

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/cohereHonorific', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: userInput }),
        });

        const data = await response.json();

        if (data.result) {
            resultArea.innerText = data.result;
            document
                .getElementById('pdfDownloadBtn')
                .addEventListener('click', function () {
                    html2pdf(data.result); // 이 방법으로 HTML을 PDF로 변환
                });
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
        spinner.style.display = 'none';
    }
}

async function cohereInformal() {
    const userInput = document.getElementById('userInput').value;
    const resultArea = document.getElementById('resultArea');
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';
    resultArea.innerHTML = ''; // HTML 내용을 지움

    if (!userInput.trim()) {
        resultArea.innerText = '입력된 문장이 없습니다.';
        return;
    }

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/cohereInformal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: userInput }),
        });

        const data = await response.json();

        if (data.result) {
            resultArea.innerText = data.result;
            document
                .getElementById('pdfDownloadBtn')
                .addEventListener('click', function () {
                    html2pdf(data.result); // 이 방법으로 HTML을 PDF로 변환
                });
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
        spinner.style.display = 'none';
    }
}

async function applyTranslation() {
    const text = document.getElementById('translateInput').value.trim();
    const sourceLang = document.getElementById('sourceSelector').value;
    const targetLang = document.getElementById('targetSelector').value;
    const resultBox = document.getElementById('translateResult');
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';
    resultBox.innerText = '';

    if (!text) {
        alert('번역할 문장을 입력해주세요.');
        return;
    }

    try {
        const res = await fetch('https://storycraft-ppxj.onrender.com/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                source: sourceLang,
                target: targetLang,
            }),
        });

        const data = await res.json();

        if (data.result) {
            resultBox.innerText = data.result;
            document
                .getElementById('pdfDownloadBtn')
                .addEventListener('click', function () {
                    html2pdf(data.result); // 이 방법으로 HTML을 PDF로 변환
                });
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
        spinner.style.display = 'none';
    }
}

async function pdfScanGrammar() {
    const form = document.getElementById('uploadForm');
    const grammarTable = document.getElementById('grammarTable');
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';
    if (grammarTable) {
        grammarTable.style.visibility = 'visible';
    }
    const tbody = document.querySelector('tbody');
    if (!tbody) {
        console.error('grammarTable 내부에 tbody가 없습니다.');
        return;
    }

    const fileInput = document.getElementById('pdfFile');
    const file = fileInput.files[0];

    const formData = new FormData();
    formData.append('pdf', file);

    const resultArea = document.getElementById('resultArea');

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/pdfScan', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        console.log('Success:', result.text);

        const grammarOriginalText =
            result.text || '[텍스트를 추출하지 못했습니다]';

        // 이 시점에서 grammarOriginalText를 가지고 두 번째 fetch
        const grammarResponse = await fetch(
            'https://storycraft-ppxj.onrender.com/mistralGrammar',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: grammarOriginalText }),
            }
        );

        const grammarData = await grammarResponse.json();
        console.log('Grammar Check Result:', grammarData.result);

        const text = grammarData.result;

        if (text) {
            const lines = text
                .split(/\n+/)
                .map((line) => line.trim())
                .filter((line) => line.length > 0); // 여기서 빈 줄 제거됨

            const table = document.getElementById('grammarTable');

            function removeIcons(text) {
                // 이모지 제거
                return text.replace(/^[^\w가-힣]+/, '').trim();
            }

            let hasError = false; // 틀린 문장이 하나라도 발견되었음을 기록

            for (let i = 0; i < lines.length; i += 4) {
                const cleanLine1 = removeIcons(lines[i]);
                const cleanLine2 = removeIcons(lines[i + 1]);

                if (cleanLine1 === cleanLine2) {
                    // 맞는 문장이면 기록하지 않고 넘어감
                    continue;
                }

                hasError = true;

                const row = document.createElement('tr');

                const tdLeft = document.createElement('td');
                const tdRight = document.createElement('td');
                tdRight.classList.add('right');

                // ❌문장 vs ✅문장 비교 및 하이라이트
                const [highlightedWrong, highlightedCorrect] =
                    highlightDifference(lines[i], lines[i + 1]);

                // 하이라이트된 결과를 tdLeft에 innerHTML로 삽입
                tdLeft.innerHTML = `
                    <div class="sentence"> ${highlightedWrong}</div>
                    <div class="sentence"> ${highlightedCorrect}</div>
                `;

                // tdRight는 기존처럼 규칙 설명 출력
                tdRight.textContent = lines[i + 2] + '\n' + lines[i + 3];

                row.appendChild(tdLeft);
                row.appendChild(tdRight);
                tbody.appendChild(row);
            }

            if (!hasError) {
                alert('🎉 틀린 부분이 없습니다.');
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
        console.error('Error:', error);
        resultArea.textContent =
            '[에러 발생: PDF를 처리하거나 문법 교정에 실패했습니다]';
    } finally{
        spinner.style.display = 'none';
    }
}

async function pdfScanStyle() {
    const form = document.getElementById('uploadForm');
    const style = document.getElementById('styleSelect').value;
    const grammarTable = document.getElementById('grammarTable');
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';
    grammarTable.style.visibility = 'hidden';

    const fileInput = document.getElementById('pdfFile');
    const file = fileInput.files[0];

    const formData = new FormData();
    formData.append('pdf', file);

    const resultArea = document.getElementById('resultArea');

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/pdfScan', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        console.log('Success:', result.text);

        const styleOriginalText =
            result.text || '[텍스트를 추출하지 못했습니다]';

        // 이 시점에서 styleOriginalText를 가지고 두 번째 fetch
        const styleResponse = await fetch(
            'https://storycraft-ppxj.onrender.com/gptStyleChange',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: styleOriginalText,
                    style: style,
                }),
            }
        );

        const styleData = await styleResponse.json();
        console.log('Style Change Result:', styleData.styled_text);

        const text = styleData.styled_text;
        resultArea.innerText = text;

        document
            .getElementById('pdfDownloadBtn')
            .addEventListener('click', function () {
                html2pdf(text); // 이 방법으로 HTML을 PDF로 변환
            });
    } catch (error) {
        console.error('Error:', error);
        resultArea.textContent =
            '[에러 발생: PDF를 처리하거나 문체 변경에 실패했습니다]';
    } finally {
        spinner.style.display = 'none';
    }
}

async function pdfScanRewrite() {
    // 첨삭
    const form = document.getElementById('uploadForm');
    const grammarTable = document.getElementById('grammarTable');
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';
    grammarTable.style.visibility = 'hidden';

    const fileInput = document.getElementById('pdfFile');
    const file = fileInput.files[0];

    const formData = new FormData();
    formData.append('pdf', file);

    const resultArea = document.getElementById('resultArea');
    const isScanPage = window.location.pathname.includes("scan.html");


    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/pdfScan', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        console.log('Success:', result.text);

        const rewriteOriginalText =
            result.text || '[텍스트를 추출하지 못했습니다]';

        // 이 시점에서 rewriteOriginalText를 가지고 두 번째 fetch
        const rewriteResponse = await fetch(
            'https://storycraft-ppxj.onrender.com/mistralRewrite',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: rewriteOriginalText,
                    style: 'default',
                    source: 'scan'
                 }),
            }
        );

        const rewriteData = await rewriteResponse.json();
        console.log('Rewrite Result:', rewriteData.result); // 여기까진 잘 나옴
        resultArea.innerHTML = '';

        const examples = isScanPage
            ? [rewriteData.result.trim()]  // ✅ 하나만 있는 경우: 배열에 통째로 넣음
            : rewriteData.result
                .split(/예시문 \d+:/)
                .map((text) => text.trim())
                .filter((text) => text.length > 0);

        examples.forEach((text, idx) => {
            const exampleId = `example${idx + 1}`;
            const wrapper = document.createElement('div');
            wrapper.id = `${exampleId}-wrapper`;

            const label = document.createElement('div');
            label.innerText = examples.length === 1 ? '예시문:' : `예시문 ${idx + 1}:`;


            const content = document.createElement('p');
            content.id = exampleId;
            content.innerHTML = highlightDiffWithType(
                rewriteOriginalText,
                text
            );

            wrapper.appendChild(label);
            wrapper.appendChild(content);

            wrapper.style.marginBottom = '20px';

            resultArea.appendChild(wrapper);

            document
                .getElementById('pdfDownloadBtn')
                .addEventListener('click', function () {
                    html2pdf(wrapper); // 이 방법으로 HTML을 PDF로 변환
                });
        });
    } catch (error) {
        console.error('Error:', error);
        resultArea.textContent =
            '[에러 발생: PDF를 처리하거나 첨삭에 실패했습니다]';
    } finally {
        spinner.style.display = 'none';
    }
}

async function pdfScanSummary() {
    // 요약
    const form = document.getElementById('uploadForm');
    const grammarTable = document.getElementById('grammarTable');
    grammarTable.style.visibility = 'hidden';
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';

    const fileInput = document.getElementById('pdfFile');
    const file = fileInput.files[0];

    const formData = new FormData();
    formData.append('pdf', file);

    const resultArea = document.getElementById('resultArea');

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/pdfScan', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        console.log('Success:', result.text);

        const summaryOriginalText =
            result.text || '[텍스트를 추출하지 못했습니다]';

        // 이 시점에서 summaryOriginalText를 가지고 두 번째 fetch
        const summaryResponse = await fetch('https://storycraft-ppxj.onrender.com/summary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: summaryOriginalText }),
        });

        const summaryData = await summaryResponse.json();
        console.log('Summary Result:', summaryData.result);

        if (summaryData.result) {
            resultArea.innerHTML = `
              <p style="white-space: pre-wrap;">${summaryData.result}</p>
            `;
            document
                .getElementById('pdfDownloadBtn')
                .addEventListener('click', function () {
                    html2pdf(summaryData.result); // 이 방법으로 HTML을 PDF로 변환
                });
        } else {
            resultArea.innerText = `⚠️ 요약 실패: ${
                summaryData.error || '알 수 없는 오류'
            }`;
        }
    } catch (error) {
        console.error('Error:', error);
        resultArea.textContent =
            '[에러 발생: PDF를 처리하거나 요약에 실패했습니다]';
    } finally {
        spinner.style.display = 'none';
    }
}

async function pdfScanExpand() {
    // 확장
    const form = document.getElementById('uploadForm');
    const grammarTable = document.getElementById('grammarTable');
    grammarTable.style.visibility = 'hidden';
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';


    const fileInput = document.getElementById('pdfFile');
    const file = fileInput.files[0];

    const formData = new FormData();
    formData.append('pdf', file);

    const resultArea = document.getElementById('resultArea');

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/pdfScan', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        console.log('Success:', result.text);

        const expandOriginalText =
            result.text || '[텍스트를 추출하지 못했습니다]';

        // 이 시점에서 expandOriginalText를 가지고 두 번째 fetch
        const expandResponse = await fetch('https://storycraft-ppxj.onrender.com/expand', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: expandOriginalText }),
        });

        const expandData = await expandResponse.json();
        console.log('Expand Result:', expandData.result);

        if (expandData.result) {
            resultArea.innerHTML = `
              <p style="white-space: pre-wrap;">${expandData.result}</p>
            `;
            document
                .getElementById('pdfDownloadBtn')
                .addEventListener('click', function () {
                    html2pdf(expandData.result); // 이 방법으로 HTML을 PDF로 변환
                });
        } else {
            resultArea.innerText = `⚠️ 확장 실패: ${
                expandData.error || '알 수 없는 오류'
            }`;
        }
    } catch (error) {
        console.error('Error:', error);
        resultArea.textContent =
            '[에러 발생: PDF를 처리하거나 확장에 실패했습니다]';
    } finally {
        spinner.style.display = 'none';
    }
}

async function pdfScanHonorific() {
    const form = document.getElementById('uploadForm');
    const grammarTable = document.getElementById('grammarTable');
    grammarTable.style.visibility = 'hidden';
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';

    const fileInput = document.getElementById('pdfFile');
    const file = fileInput.files[0];

    const formData = new FormData();
    formData.append('pdf', file);

    const resultArea = document.getElementById('resultArea');

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/pdfScan', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        console.log('Success:', result.text);

        const honorificOriginalText =
            result.text || '[텍스트를 추출하지 못했습니다]';

        // 이 시점에서 honorificOriginalText를 가지고 두 번째 fetch
        const honorificResponse = await fetch(
            'https://storycraft-ppxj.onrender.com/cohereHonorific',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: honorificOriginalText }),
            }
        );

        const honorificData = await honorificResponse.json();
        console.log('Honorific Result:', honorificData.result);

        const text = honorificData.result;
        resultArea.innerText = text;

        document
            .getElementById('pdfDownloadBtn')
            .addEventListener('click', function () {
                html2pdf(text); // 이 방법으로 HTML을 PDF로 변환
            });
    } catch (error) {
        console.error('Error:', error);
        resultArea.textContent =
            '[에러 발생: PDF를 처리하거나 높임말 변환에 실패했습니다]';
    } finally {
        spinner.style.display = 'none';
    }
}

async function pdfScanInformal() {
    const form = document.getElementById('uploadForm');
    const grammarTable = document.getElementById('grammarTable');
    grammarTable.style.visibility = 'hidden';
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';

    const fileInput = document.getElementById('pdfFile');
    const file = fileInput.files[0];

    const formData = new FormData();
    formData.append('pdf', file);

    const resultArea = document.getElementById('resultArea');

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/pdfScan', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        console.log('Success:', result.text);

        const informalOriginalText =
            result.text || '[텍스트를 추출하지 못했습니다]';

        // 이 시점에서 honorificOriginalText를 가지고 두 번째 fetch
        const informalResponse = await fetch(
            'https://storycraft-ppxj.onrender.com/cohereInformal',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: informalOriginalText }),
            }
        );

        const informalData = await informalResponse.json();
        console.log('Informal Result:', informalData.result);

        const text = informalData.result;
        resultArea.innerText = text;

        document
            .getElementById('pdfDownloadBtn')
            .addEventListener('click', function () {
                html2pdf(text); // 이 방법으로 HTML을 PDF로 변환
            });
    } catch (error) {
        console.error('Error:', error);
        resultArea.textContent =
            '[에러 발생: PDF를 처리하거나 반말 변환에 실패했습니다]';
    } finally {
        spinner.style.display = 'none';
    }
}

async function pdfScanTranslate() {
    const fileInput = document.getElementById('pdfFile');
    const file = fileInput.files[0];
    const resultArea = document.getElementById('resultArea');
    const spinner = document.getElementById('loadingSpinner');
    const sourceLang = document.getElementById('sourceSelector').value;
    const targetLang = document.getElementById('targetSelector').value;

    spinner.style.display = 'block';
    resultArea.innerHTML = '';

    const formData = new FormData();
    formData.append('pdf', file);

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/pdfScan', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        const extractedText = result.text || '[텍스트를 추출하지 못했습니다]';

        const translateResponse = await fetch('https://storycraft-ppxj.onrender.com/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: extractedText,
                source: sourceLang,
                target: targetLang
            }),
        });

        const translateData = await translateResponse.json();

        if (translateData.result) {
            resultArea.innerHTML = `
                <div id="translatedBox">
                    <p style="white-space: pre-wrap;">${translateData.result}</p>
                </div>
            `;

            document.getElementById('pdfDownloadBtn').addEventListener('click', function () {
                const translatedBox = document.getElementById('translatedBox');
                html2pdf(translatedBox);
            });
        } else {
            resultArea.innerText = `⚠️ 번역 오류: ${translateData.error || '알 수 없는 오류'}`;
        }
    } catch (error) {
        console.error('번역 오류:', error);
        resultArea.innerText = '❗ 번역 중 오류가 발생했습니다.';
    } finally {
        spinner.style.display = 'none';
    }
}


function highlightDifference(a, b) {
    let resultA = '';
    let resultB = '';
    let i = 0,
        j = 0;

    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            resultA += a[i];
            resultB += b[j];
            i++;
            j++;
        } else {
            let diffA = '',
                diffB = '';
            let startI = i,
                startJ = j;

            while (i < a.length && j < b.length && a[i] !== b[j]) {
                diffA += a[i++];
                diffB += b[j++];
            }

            resultA += `<span class="highlight">${diffA}</span>`;
            resultB += `<span class="highlight">${diffB}</span>`;
        }
    }

    if (i < a.length) resultA += `<span class="highlight">${a.slice(i)}</span>`;
    if (j < b.length) resultB += `<span class="highlight">${b.slice(j)}</span>`;

    return [resultA, resultB];
}

function highlightDiffWithType(original, revised) {
    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(original, revised);
    dmp.diff_cleanupSemantic(diffs);

    const result = [];

    for (let i = 0; i < diffs.length; i++) {
        const [op, text] = diffs[i];

        if (op === 0) {
            result.push(text);
        } else if (op === -1 && diffs[i + 1] && diffs[i + 1][0] === 1) {
            const addedText = diffs[i + 1][1];
            const deletedText = text;

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

            result.push(`
                <span class="${cssClass}">
                    ${addedText}
                    <span class="custom-tooltip">${tip}</span>
                </span>
            `);
            i++;
        } else if (op === 1) {
            result.push(`
                <span class="tooltip-wrapper highlight-added">
                    ${text}
                    <span class="custom-tooltip">새로 추가된 표현이에요</span>
                </span>
            `);
        }
    }

    return result.join('');
}
