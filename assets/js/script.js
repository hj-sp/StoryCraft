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
});

async function searchExample() {
    const userInput = document.getElementById('userInput').value;
    const resultArea = document.getElementById('resultArea');

    if (!userInput.trim()) {
        alert('입력된 문장이 없습니다.');
        return;
    }

    try {
        const response = await fetch('https://storycraft-ppxj.onrender.com/searchExample', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: userInput }),
        });

        const data = await response.json();

        if (data.examples) {
            resultArea.innerText = '✨ 예문 결과 ✨\n\n' + data.examples;
        } else if (data.error) {
            resultArea.innerText = `⚠️ 오류: ${data.error}`;
            console.error('에러 응답 내용:', data);
        } else {
            resultArea.innerText = '⚠️ 알 수 없는 오류가 발생했습니다.';
            console.warn('예상치 못한 응답 구조:', data);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        alert('❗요청 중 오류가 발생했습니다.');
    }
}

async function mistralRewrite() {
    const userInput = document.getElementById('userInput').value;
    const resultArea = document.getElementById('resultArea');
    // resultArea.innerHTML = ''; // HTML 내용을 지움

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
            content.innerText = text;

            const select = document.createElement('select');
            select.id = `${exampleId}-style`;
            ['casual', 'formal', 'literary', 'academic'].forEach((style) => {
                const option = document.createElement('option');
                option.value = style;
                option.innerText =
                    style.charAt(0).toUpperCase() + style.slice(1);
                select.appendChild(option);
            });

            const button = document.createElement('button');
            button.innerText = '스타일 적용 ✍️';
            button.onclick = () => changeStyle(exampleId);

            wrapper.appendChild(label);
            wrapper.appendChild(content);
            wrapper.appendChild(select);
            wrapper.appendChild(button);
            wrapper.style.marginBottom = '20px';

            resultArea.appendChild(wrapper);
        });
    } catch (error) {
        console.error('Fetch error:', error);
        alert('❗요청 중 오류가 발생했습니다.');
    }
}

async function changeStyle(exampleId) {
    const selectedText = document.getElementById(exampleId).innerText.trim();
    const styleRaw = document.getElementById(`${exampleId}-style`).value;
    const style = styleRaw.toLowerCase();

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
    } catch (error) {
        console.error('스타일 변경 중 오류:', error);
        alert('❗스타일 변경 요청 중 오류가 발생했습니다.');
    }
}

async function summarizeText() {
    const userInput = document.getElementById('userInput').value;
    const resultArea = document.getElementById('resultArea');
    const summaryExpandResults = document.getElementById(
        'summaryExpandResults'
    );

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
            // resultArea.innerHTML = ''; // HTML 내용을 지움
            summaryExpandResults.innerText = `📚 요약 결과:\n\n${data.result}`;
        } else {
            summaryExpandResults.innerText = `⚠️ 요약 실패: ${
                data.error || '알 수 없는 오류'
            }`;
        }
    } catch (error) {
        console.error('요약 요청 중 오류:', error);
        summaryExpandResults.innerText = '❗요약 요청 중 오류가 발생했습니다.';
    }
}

async function expandText() {
    const userInput = document.getElementById('userInput').value;
    const summaryExpandResults = document.getElementById(
        'summaryExpandResults'
    );

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
            summaryExpandResults.innerText = `🚀 확장 결과:\n\n${data.result}`;
        } else {
            summaryExpandResults.innerText = `⚠️ 확장 실패: ${
                data.error || '알 수 없는 오류'
            }`;
        }
    } catch (error) {
        console.error('확장 요청 중 오류:', error);
        summaryExpandResults.innerText = '❗확장 요청 중 오류가 발생했습니다.';
    }
}

async function mistralGrammar() {
    const userInput = document.getElementById('userInput').value;
    const resultArea = document.getElementById('resultArea');
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
    }
}

async function cohereHonorific() {
    const userInput = document.getElementById('userInput').value;
    const resultArea = document.getElementById('resultArea');
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
    }
}

async function cohereInformal() {
    const userInput = document.getElementById('userInput').value;
    const resultArea = document.getElementById('resultArea');
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
