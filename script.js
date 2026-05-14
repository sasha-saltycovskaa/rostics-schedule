// ========== ДАННЫЕ ==========
const daysOfWeek = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
let allEmployees = [];
let currentEmployee = null;

// Google Script URL (ЗАМЕНИТЕ НА ВАШ!)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw5CXxWZYGKe8zYG8JAIf5ANpRsqq1KWdZI-QBGuDI6rRwdxmxyfj7DDJ4jrEE8NX6I/exec';

// Логин и пароль администратора
const ADMIN_LOGIN = 'admin12';
const ADMIN_PASSWORD = '5678';

// ========== ЗАГРУЗКА ==========
function loadData() {
    const saved = localStorage.getItem('rostics_schedule');
    if (saved) {
        allEmployees = JSON.parse(saved);
    }
}

function saveDataToStorage() {
    localStorage.setItem('rostics_schedule', JSON.stringify(allEmployees));
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function goToPage2() {
    const name = document.getElementById('employeeName').value.trim();
    if (!name) {
        alert('Пожалуйста, введите ваше ФИО');
        return;
    }
    
    currentEmployee = name;
    const existing = allEmployees.find(e => e.fullName === name);
    const formDiv = document.getElementById('scheduleForm');
    formDiv.innerHTML = '';
    
    daysOfWeek.forEach(day => {
        const fullDayName = getFullDayName(day);
        const existingSchedule = existing ? existing.schedule[day] : '';
        const isDayOff = existingSchedule === 'выходной';
        const timeRange = (!isDayOff && existingSchedule && existingSchedule !== 'выходной') 
            ? existingSchedule.split('-') : ['12:00', '20:00'];
        
        const row = document.createElement('div');
        row.className = 'day-row';
        row.innerHTML = `
            <div class="day-name">${fullDayName}</div>
            <div class="time-inputs">
                <span>с</span>
                <input type="time" id="from_${day}" value="${timeRange[0]}" ${isDayOff ? 'disabled' : ''}>
                <span>до</span>
                <input type="time" id="to_${day}" value="${timeRange[1]}" ${isDayOff ? 'disabled' : ''}>
            </div>
            <div class="dayoff-checkbox">
                <input type="checkbox" id="dayoff_${day}" ${isDayOff ? 'checked' : ''} onchange="toggleDayOff('${day}')">
                <label>Выходной</label>
            </div>
        `;
        formDiv.appendChild(row);
    });
    showPage('page2');
}

function getFullDayName(short) {
    const names = {
        'ПН': 'Понедельник', 'ВТ': 'Вторник', 'СР': 'Среда',
        'ЧТ': 'Четверг', 'ПТ': 'Пятница', 'СБ': 'Суббота', 'ВС': 'Воскресенье'
    };
    return names[short];
}

function toggleDayOff(day) {
    const isChecked = document.getElementById(`dayoff_${day}`).checked;
    const fromInput = document.getElementById(`from_${day}`);
    const toInput = document.getElementById(`to_${day}`);
    fromInput.disabled = isChecked;
    toInput.disabled = isChecked;
    if (isChecked) {
        fromInput.value = '';
        toInput.value = '';
    } else {
        fromInput.value = '12:00';
        toInput.value = '20:00';
    }
}

// ========== СОХРАНЕНИЕ ==========
async function saveSchedule() {
    if (!currentEmployee) return;
    
    const schedule = {};
    for (let day of daysOfWeek) {
        const isDayOff = document.getElementById(`dayoff_${day}`).checked;
        if (isDayOff) {
            schedule[day] = 'выходной';
        } else {
            const from = document.getElementById(`from_${day}`).value;
            const to = document.getElementById(`to_${day}`).value;
            schedule[day] = from && to ? `${from}-${to}` : 'не указано';
        }
    }
    
    const dataToSend = { fullName: currentEmployee, schedule: schedule };
    
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend)
        });
        console.log('Сохранено в Google');
    } catch (error) {
        console.error('Ошибка:', error);
    }
    
    const index = allEmployees.findIndex(e => e.fullName === currentEmployee);
    if (index !== -1) {
        allEmployees[index].schedule = schedule;
    } else {
        allEmployees.push({ fullName: currentEmployee, schedule: schedule });
    }
    allEmployees.sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'));
    saveDataToStorage();
    showPage('page3');
}

function goToPage1() {
    document.getElementById('employeeName').value = '';
    currentEmployee = null;
    showPage('page1');
}

// ========== АДМИНИСТРАТОР ==========
const modal = document.getElementById('adminModal');
const adminBtn = document.getElementById('adminBtn');
const closeBtn = document.querySelector('.close');

if (adminBtn) {
    adminBtn.onclick = () => modal.style.display = 'block';
}
if (closeBtn) {
    closeBtn.onclick = () => modal.style.display = 'none';
}
window.onclick = (event) => {
    if (event.target == modal) modal.style.display = 'none';
}

function checkAdminLogin() {
    const login = document.getElementById('adminLogin').value;
    const password = document.getElementById('adminPassword').value;
    if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
        modal.style.display = 'none';
        showAdminTable();
    } else {
        alert('Неверный логин или пароль!');
    }
}

function showAdminTable() {
    showPage('adminPage');
    renderAdminTable();
}

async function renderAdminTable() {
    const tableDiv = document.getElementById('adminTable');
    tableDiv.innerHTML = '<p>Загрузка данных из Google...</p>';
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        if (!data || data.length <= 1) {
            tableDiv.innerHTML = '<p style="text-align:center; padding:40px;">Нет данных.</p>';
            return;
        }
        const headers = data[0];
        const rows = data.slice(1).filter(row => row[0] && row[0] !== '');
        rows.sort((a, b) => a[0].localeCompare(b[0], 'ru'));
        
        let html = '<table><thead><tr>';
        for (let i = 0; i < headers.length; i++) {
            if (headers[i] !== 'Время сохранения') html += `<th>${headers[i]}</th>`;
        }
        html += '</tr></thead><tbody>';
        
        for (let row of rows) {
            html += '<tr>';
            for (let i = 0; i < row.length; i++) {
                if (headers[i] !== 'Время сохранения') {
                    let value = row[i] || '';
                    if (value === 'выходной') value = '<span style="color:red;font-weight:bold;">🚫 Выходной</span>';
                    html += `<td>${value}</td>`;
                }
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        tableDiv.innerHTML = html;
        
        // Обновляем локальный массив
        allEmployees = [];
        for (let row of rows) {
            const schedule = {};
            for (let i = 1; i < headers.length; i++) {
                const day = headers[i];
                if (day !== 'Время сохранения' && row[i]) schedule[day] = row[i];
            }
            allEmployees.push({ fullName: row[0], schedule });
        }
        saveDataToStorage();
    } catch (error) {
        console.error(error);
        tableDiv.innerHTML = '<p style="color:red;">Ошибка загрузки данных</p>';
    }
}

function logoutAdmin() {
    showPage('page1');
    document.getElementById('adminLogin').value = '';
    document.getElementById('adminPassword').value = '';
}

function downloadCSV() {
    if (allEmployees.length === 0) {
        alert('Нет данных');
        return;
    }
    let rows = [['Сотрудник', ...daysOfWeek.map(d => getFullDayName(d))]];
    for (let emp of allEmployees) {
        let row = [emp.fullName];
        for (let day of daysOfWeek) row.push(emp.schedule[day] || '');
        rows.push(row);
    }
    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'rostics_raspisanie.csv';
    link.click();
    URL.revokeObjectURL(link.href);
}

function printTable() {
    window.print();
}

function resetAllData() {
    if (confirm('Удалить все данные?')) {
        allEmployees = [];
        saveDataToStorage();
        renderAdminTable();
        alert('Данные удалены');
    }
}

loadData();
