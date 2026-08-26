// --- VARIABEL GLOBAL ---
let historyEnds = [];        // Menyimpan data rambahan yang sudah selesai
let currentEndArrows = [];   // Menyimpan anak panah di rambahan aktif

let timerDuration = 120;     // Durasi default (120 detik)
let timerSeconds = 120;      // Sisa waktu berjalan
let timerInterval = null;    // Referensi interval timer
let scoreChart = null;       // Objek grafik Chart.js

// --- KELAS WARNA BADGE ---
function getBadgeColorClass(label) {
    if (label === 'X' || label === '10' || label === '9') return 'bg-gold';
    if (label === '8' || label === '7') return 'bg-red';
    if (label === '6' || label === '5') return 'bg-blue';
    if (label === '4' || label === '3') return 'bg-black';
    if (label === '2' || label === '1') return 'bg-white';
    return 'bg-miss';
}

// --- LOGIKA UTAMA SKOR & RAMBAHAN ---
function getArrowsLimit() {
    return parseInt(document.getElementById('arrows-per-end').value);
}

function addArrow(label, value) {
    const limit = getArrowsLimit();
    
    if (currentEndArrows.length < limit) {
        currentEndArrows.push({ label: label, value: value });
        
        if (currentEndArrows.length === limit) {
            historyEnds.push([...currentEndArrows]);
            currentEndArrows = [];
        }
        updateUI();
        updateChart();
        saveToLocalStorage(); // Simpan setiap ada perubahan data
    }
}

function undoArrow() {
    if (currentEndArrows.length > 0) {
        currentEndArrows.pop();
    } else if (historyEnds.length > 0) {
        currentEndArrows = historyEnds.pop();
        currentEndArrows.pop();
    }
    updateUI();
    updateChart();
    saveToLocalStorage(); // Simpan perubahan setelah undo
}

function resetScore() {
    if (confirm("Apakah Anda yakin ingin menghapus semua data skor dan riwayat?")) {
        historyEnds = [];
        currentEndArrows = [];
        updateUI();
        updateChart();
        saveToLocalStorage(); // Kosongkan data di LocalStorage
    }
}

// --- LOGIKA LOCALSTORAGE (PENYIMPANAN LOKAL) ---
function saveToLocalStorage() {
    const archeryData = {
        historyEnds: historyEnds,
        currentEndArrows: currentEndArrows,
        arrowsPerEnd: document.getElementById('arrows-per-end').value
    };
    localStorage.setItem('archeryProScoreData', JSON.stringify(archeryData));
}

function loadFromLocalStorage() {
    const localData = localStorage.getItem('archeryProScoreData');
    if (localData) {
        const parsedData = JSON.parse(localData);
        historyEnds = parsedData.historyEnds || [];
        currentEndArrows = parsedData.currentEndArrows || [];
        
        // Kembalikan pilihan opsi jumlah anak panah jika ada
        if (parsedData.arrowsPerEnd) {
            document.getElementById('arrows-per-end').value = parsedData.arrowsPerEnd;
        }
    }
}

// --- LOGIKA UPDATE TAMPILAN (UI) ---
function updateUI() {
    let totalScore = 0;
    let count10PlusX = 0;
    let countX = 0;

    historyEnds.forEach(end => {
        end.forEach(arrow => {
            totalScore += arrow.value;
            if (arrow.label === '10' || arrow.label === 'X') count10PlusX++;
            if (arrow.label === 'X') countX++;
        });
    });

    currentEndArrows.forEach(arrow => {
        totalScore += arrow.value;
        if (arrow.label === '10' || arrow.label === 'X') count10PlusX++;
        if (arrow.label === 'X') countX++;
    });

    document.getElementById('total-score').innerText = totalScore;
    document.getElementById('count-10').innerText = count10PlusX;
    document.getElementById('count-x').innerText = countX;
    document.getElementById('current-end-num').innerText = historyEnds.length + 1;

    const container = document.getElementById('ends-container');
    container.innerHTML = '';

    const allEndsToRender = [...historyEnds];
    if (currentEndArrows.length > 0) {
        allEndsToRender.push(currentEndArrows);
    }

    allEndsToRender.forEach((end, index) => {
        const endRow = document.createElement('div');
        endRow.className = 'end-row';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'end-title';
        titleDiv.innerText = `Remb. ${index + 1}`;
        endRow.appendChild(titleDiv);

        const arrowsDiv = document.createElement('div');
        arrowsDiv.className = 'end-arrows';

        let endTotalScore = 0;
        end.forEach(arrow => {
            endTotalScore += arrow.value;
            const badge = document.createElement('span');
            badge.className = `arrow-badge ${getBadgeColorClass(arrow.label)}`;
            badge.innerText = arrow.label;
            arrowsDiv.appendChild(badge);
        });
        
        endRow.appendChild(arrowsDiv);

        const totalDiv = document.createElement('div');
        totalDiv.className = 'end-total';
        totalDiv.innerText = endTotalScore;
        endRow.appendChild(totalDiv);

        container.appendChild(endRow);
    });
}

// --- INISIALISASI & UPDATE GRAFIK ---
function initChart() {
    const ctx = document.getElementById('scoreChart').getContext('2d');
    scoreChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Skor Per Rambahan',
                data: [],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: getArrowsLimit() * 10
                }
            }
        }
    });
    updateChart(); // Jalankan update chart pertama kali setelah load data lokal
}

function updateChart() {
    if (!scoreChart) return;

    const labels = [];
    const data = [];

    historyEnds.forEach((end, index) => {
        labels.push(`Remb ${index + 1}`);
        const endTotal = end.reduce((sum, arrow) => sum + arrow.value, 0);
        data.push(endTotal);
    });

    scoreChart.data.labels = labels;
    scoreChart.data.datasets[0].data = data;
    scoreChart.options.scales.y.max = getArrowsLimit() * 10;
    scoreChart.update();
}



// --- LOGIKA PENGATURAN WAKTU (TIMER) ---
function setTimer(seconds) {
    clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById('btn-start').innerText = "Mulai";
    document.getElementById('btn-start').style.background = "#2ed573";
    timerDuration = seconds;
    timerSeconds = seconds;
    displayTimer();
}

function toggleTimer() {
    const startBtn = document.getElementById('btn-start');
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        startBtn.innerText = "Lanjutkan";
        startBtn.style.background = "#ffa502";
    } else {
        startBtn.innerText = "Pause";
        startBtn.style.background = "#ff4757";
        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                displayTimer();
            } else {
                clearInterval(timerInterval);
                timerInterval = null;
                startBtn.innerText = "Selesai";
                startBtn.style.background = "#747d8c";
                alert("Waktu menembak habis!");
            }
        }, 1000);
    }
}

function resetTimer() { setTimer(timerDuration); }

function displayTimer() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    document.getElementById('timer-display').innerText = 
        `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// --- URUTAN EKSEKUSI SAAT LOAD APLIKASI ---
loadFromLocalStorage(); // 1. Ambil data lama jika ada
updateUI();             // 2. Render UI berdasarkan data yang ada
initChart();            // 3. Buat objek grafik dan pasang datanya
