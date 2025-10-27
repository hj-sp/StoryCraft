async function mistralGrammar() {
    const userInput = document.getElementById('userInput').value;
    const resultArea = document.getElementById('resultArea');
    spin(true);

    const grammarTable = document.getElementById('grammarTable');
    const tbody = grammarTable ? grammarTable.querySelector('tbody') : null;

    if (!tbody) {
        console.log('⚠️ tbody 요소가 없습니다. HTML 구조를 확인하세요.');
        spin(false);
        return;
    }
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }

    if (!userInput.trim()) {
        spin(false);
        alert('입력된 문장이 없습니다.');
        return;
    }

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
            resultArea.innerText = '⚠️ 결과가 비어 있습니다.';
            return;
        }
        const text = data.result;

        if (text) {
            const lines = text
                .split(/\n+/)
                .map((line) => line.trim())
                .filter((line) => line.length > 0); // 여기서 빈 줄 제거됨

            if (
                lines.length >= 2 &&
                (/예시/.test(lines[0]) || /교정문/.test(lines[0])) &&
                (/예시/.test(lines[1]) || /규범/.test(lines[1]))
            ) {
                lines.splice(0, 2);
            }

            for (let i = 0; i < lines.length; i++) {
                lines[i] = lines[i]
                    .replace(/\s*\(?\s*예시\s*교정문\s*\)?\.?$/g, '')
                    .replace(/^\s*예시\s*규범.*$/g, '')
                    .trim();
            }
            for (let i = lines.length - 1; i >= 0; i--) {
                if (!lines[i]) lines.splice(i, 1);
            }

            const table = document.getElementById('grammarTable');

            function removeIcons(text) {
                // 이모지 제거
                return text.replace(/^[^\w가-힣]+/, '').trim();
            }

            let hasError = false; // 틀린 문장이 하나라도 발견되었음을 기록

            for (let i = 0; i + 3 < lines.length; i += 4) {
                const cleanLine1 = removeIcons(lines[i]).replace(
                    /\s*\(?\s*예시\s*교정문\s*\)?\.?$/g,
                    ''
                );
                const cleanLine2 = removeIcons(lines[i + 1]).replace(
                    /^\s*예시\s*규범.*$/g,
                    ''
                );
                const cleanLine3 = removeIcons(lines[i + 2]);
                const cleanLine4 = removeIcons(lines[i + 3]);

                if (
                    /예시|규범/.test(cleanLine1) ||
                    /예시|규범/.test(cleanLine2)
                ) {
                    continue;
                }

                if (!cleanLine1 || !cleanLine2 || cleanLine1 === cleanLine2) {
                    continue;
                }

                hasError = true;

                const row = document.createElement('tr');
                const tdLeft = document.createElement('td');
                const tdRight = document.createElement('td');
                tdRight.classList.add('right');

                tag_delete = textDiff(cleanLine1, cleanLine2);
                del_tag_delete = tag_delete.replace(
                    /<del[^>]*>.*?<\/del>/g,
                    ''
                );
                ins_tag_delete = tag_delete.replace(
                    /<ins[^>]*>.*?<\/ins>/g,
                    ''
                );

                tdLeft.innerHTML = `<span class="sentence">❌${ins_tag_delete}<br>✅${del_tag_delete}</span>`;

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

                // tdRight는 기존처럼 규칙 설명 출력
                tdRight.textContent = '📖 ' + cleanLine3 + '\n✍️ ' + cleanLine4;

                row.appendChild(tdLeft);
                row.appendChild(tdRight);
                tbody.appendChild(row);

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
                    navigator.clipboard.writeText(cleanLine2.trim());
                    copyBtn.innerText = '✅';
                    setTimeout(() => (copyBtn.innerText = '📋'), 1000);
                };

                tdLeft.appendChild(copyBtn);

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
                                        node.textContent =
                                            node.textContent.replace(/📋/g, '');
                                    }
                                });
                            }
                        });

                        // HTML 그대로 PDF로 저장
                        saveAsPDF(cloned.innerHTML, '문법 교정.pdf');
                    };
                }
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
        spin(false);
    }
}
