document.addEventListener('DOMContentLoaded', () => {
    // 최신 배포된 Google Apps Script URL
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyPCU-a7KzNSN8w0-VeUaVqUZrAR420uQSXBMf2gYovEskzNk-4u21257MG-5VNgM0/exec';

    const recordForm = document.getElementById('record-form');
    const recordsContainer = document.getElementById('records-container');
    const dateInput = document.getElementById('date');
    const exportButton = document.getElementById('export-excel');
    const moodChartCanvas = document.getElementById('mood-chart');
    let recordsCache = [];
    let moodChart;

    // 페이지 로드 시 오늘 날짜 기본 설정
    dateInput.value = new Date().toISOString().split('T')[0];

    // 서버에서 데이터 가져오기
    const loadRecords = async () => {
        try {
            const response = await fetch(WEB_APP_URL, { method: 'GET', mode: 'cors' });
            const data = await response.json();

            if (!Array.isArray(data)) {
                console.error("Google Apps Script 에러:", data);
                throw new Error('데이터를 가져오지 못했습니다.');
            }

            recordsCache = data;
            recordsCache.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

            recordsContainer.innerHTML = '';
            recordsCache.forEach(addRecordToDOM);
            renderMoodChart();

        } catch (error) {
            console.error(error);
            recordsContainer.innerHTML = `<p style="color:red;">데이터를 불러오지 못했습니다.</p>`;
        }
    };

    // DOM에 기록 추가
    const addRecordToDOM = (record) => {
        const row = document.createElement('div');
        row.classList.add('record-row');

        const moodEmojis = { '행복': '😄', '보통': '😐', '우울': '😔', '분노': '😡' };
        const typeText = { 'deed': '😊 선행했어요', 'help': '💖 도움받았어요' };

        row.innerHTML = `
            <div class="record-type ${record.Type}">${typeText[record.Type] || record.Type}</div>
            <div class="record-content" title="${record.Content}">${record.Content}</div>
            <div class="record-reaction" title="${record.Reaction}">${record.Reaction || '-'}</div>
            <div class="record-date">${new Date(record.Date).toLocaleDateString()}</div>
            <div class="record-mood">${moodEmojis[record.Mood] || ''}</div>
        `;
        recordsContainer.appendChild(row);
    };

    // 기분 통계 차트 렌더링
    const renderMoodChart = () => {
        const moodCounts = recordsCache.reduce((acc, record) => {
            acc[record.Mood] = (acc[record.Mood] || 0) + 1;
            return acc;
        }, {});

        const chartData = {
            labels: Object.keys(moodCounts),
            datasets: [{
                label: '기분별 횟수',
                data: Object.values(moodCounts),
                backgroundColor: ['#FFC107', '#FF7043', '#8BC34A', '#2196F3', '#9C27B0'],
                hoverOffset: 4
            }]
        };

        if (moodChart) moodChart.destroy();

        moodChart = new Chart(moodChartCanvas, {
            type: 'pie',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: '전체 기분 통계' }
                }
            }
        });
    };

    // 폼 제출 이벤트
    recordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = '저장 중...';

        const formData = new FormData(recordForm);
        const data = {
            type: formData.get('type'),
            date: formData.get('date'),
            content: formData.get('content'),
            mood: formData.get('mood'),
            reaction: formData.get('reaction')
        };

        try {
            await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            alert('성공적으로 기록되었습니다!');
            recordForm.reset();
            dateInput.value = new Date().toISOString().split('T')[0];
            loadRecords();

        } catch (error) {
            console.error(error);
            alert('기록 저장 실패');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '기록하기';
        }
    });

    // 엑셀 내보내기
    exportButton.addEventListener('click', () => {
        if (recordsCache.length === 0) {
            alert('내보낼 데이터가 없습니다.');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(recordsCache);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "우리의 기록");
        XLSX.writeFile(workbook, "our_kindness_records.xlsx");
    });

    // 초기 데이터 로드
    loadRecords();
});
