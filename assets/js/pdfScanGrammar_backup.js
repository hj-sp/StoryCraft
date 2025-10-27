async function pdfScanGrammar() {
    const file = getSelectedFile();
    const grammarBox = document.getElementById('grammarBox');
    const grammarTable = document.getElementById('grammarTable');
    const tbody = grammarTable ? grammarTable.querySelector('tbody') : null;
    const resultArea =
        document.getElementById('resultArea') ||
        document.getElementById('ocrResult');
    spin(true);

    // 초기화
    if (tbody) while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    if (resultArea) resultArea.textContent = '';
    if (grammarBox) grammarBox.style.display = 'none';

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
        const lines = raw
            .split(/\n+/)
            .map((s) => s.trim())
            .filter(Boolean);
        const removeIcons = (s) => s.replace(/^[^\w가-힣]+/, '').trim();

        let hasError = false;
        const correctedOnly = [];

        for (let i = 0; i < lines.length; i += 4) {
            const cleanLine1 = removeIcons(lines[i] || '');
            const cleanLine2 = removeIcons(lines[i + 1] || '');
            const rule1 = lines[i + 2] || '';
            const rule2 = lines[i + 3] || '';
            if (!cleanLine1 && !cleanLine2) continue;
            if (cleanLine1 === cleanLine2) continue;

            hasError = true;
            correctedOnly.push(cleanLine2);

            if (tbody) {
                const row = document.createElement('tr');
                const tdLeft = document.createElement('td');
                const tdRight = document.createElement('td');
                tdRight.classList.add('right');

                // 원문/교정문
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
                // 규칙/설명
                tdRight.textContent = `${rule1}\n${rule2}`;

                // 복사 버튼
                const copyBtn = document.createElement('button');
                copyBtn.innerText = '📋';
                copyBtn.title = '교정문 복사';
                copyBtn.style =
                    'border:none;background:transparent;cursor:pointer;font-size:16px;';
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(cleanLine2.trim());
                    copyBtn.innerText = '✅';
                    setTimeout(() => (copyBtn.innerText = '📋'), 900);
                };

                tdLeft.appendChild(copyBtn);
                row.appendChild(tdLeft);
                row.appendChild(tdRight);
                tbody.appendChild(row);
            }
        }

        // 표 + 교정문만 결과 영역에 출력
        /* if (grammarBox) grammarBox.style.display = 'block';
    if (resultArea) {
      const out = correctedOnly.length ? correctedOnly.join('\n') : '[틀린 부분이 없거나 교정 결과가 비어 있습니다]';
      const pre = document.createElement('pre');
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.margin = '0';
      pre.textContent = out;
      resultArea.innerHTML = '';
      resultArea.appendChild(pre);
    }*/

        if (grammarBox && tbody && tbody.children.length > 0) {
            grammarBox.style.display = 'block';
            spin(false);
        }

        if (!hasError) alert('🎉 틀린 부분이 없습니다.');

        // PDF 저장 버튼 리바인딩
        const pdfBtn = document.getElementById('pdfDownloadBtn');
        if (pdfBtn) {
            const newBtn = pdfBtn.cloneNode(true);
            pdfBtn.replaceWith(newBtn);
            newBtn.style.display = 'inline-block';
            newBtn.addEventListener('click', () =>
                saveAsPDF(grammarBox || grammarTable, '문법 교정.pdf')
            );
        }
    } catch (e) {
        console.error('문법 교정 실패:', e);
        // CORS처럼 보이는 경우: 프록시(413/502 등)일 가능성이 큼
        if (resultArea) {
            resultArea.style.display = 'block';
            resultArea.textContent = String(e).includes('HTTP 413')
                ? '⚠️ 텍스트가 너무 길어 일부만 보내 주세요.'
                : String(e).includes('HTTP 502')
                ? '⚠️ 서버가 잠시 응답하지 않았습니다. 잠시 후 다시 시도해주세요.'
                : '❌ 문법 교정 중 오류가 발생했습니다.';
        }
        if (grammarBox) grammarBox.style.display = 'none';
    } finally {
        spin(false);
    }
}
