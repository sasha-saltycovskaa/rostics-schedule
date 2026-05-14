// ========== ДАННЫЕ ==========
const daysOfWeek = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
let allEmployees = [];     // Массив всех сотрудников
let currentEmployee = null; // Текущий сотрудник для заполнения

// Логин и пароль администратора (можно поменять)
const ADMIN_LOGIN = 'admin12';
const ADMIN_PASSWORD = '5678';

// ========== ЗАГРУЗКА ПРИ СТАРТЕ ==========
function loadData() {
    const saved = localStorage.getItem('rostics_schedule');
    if (saved) {
        allEmployees = JSON.parse(saved);
    }
}

function saveDataToStorage() {
    localStorage.setItem('rostics_schedule', JSON.stringify(allEmployees));
}

// ========== УПРАВЛЕНИЕ СТРАНИЦАМИ ==========
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// ========== СТРАНИЦА 1 → СТРАНИЦА 2 ==========
function goToPage2() {
    const name = document.getElementById('employeeName').value.trim();
    if (!name) {
        alert('Пожалуйста, введите ваше ФИО');
        return;
    }
    
    currentEmployee = name;
    
    // Ищем существующие данные сотрудника
    const existing = allEmployees.find(e => e.fullName === name);
    
    // Создаём форму
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

// ========== СОХРАНЕНИЕ РАСПИСАНИЯ ==========
function saveSchedule() {
    if (!currentEmployee) return;
    
    const schedule = {};
    
    for (let day of daysOfWeek) {
        const isDayOff = document.getElementById(`dayoff_${day}`).checked;
        if (isDayOff) {
            schedule[day] = 'выходной';
        } else {
            const from = document.getElementById(`from_${day}`).value;
            const to = document.getElementById(`to_${day}`).value;
            if (from && to) {
                schedule[day] = `${from}-${to}`;
            } else {
                schedule[day] = 'не указано';
            }
        }
    }
    
    // Находим или добавляем сотрудника
    const index = allEmployees.findIndex(e => e.fullName === currentEmployee);
    if (index !== -1) {
        allEmployees[index].schedule = schedule;
    } else {
        allEmployees.push({ fullName: currentEmployee, schedule: schedule });
    }
    
    // Сортируем по фамилии (алфавит)
    allEmployees.sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'));
    
    saveDataToStorage();
    showPage('page3');  // Переход на страницу "Сохранено"
}

// ========== СТРАНИЦА 3 → СТРАНИЦА 1 ==========
function goToPage1() {
    document.getElementById('employeeName').value = '';
    currentEmployee = null;
    showPage('page1');
}

// ========== АДМИНИСТРАТОР (МОДАЛЬНОЕ ОКНО) ==========
const modal = document.getElementById('adminModal');
const adminBtn = document.getElementById('adminBtn');
const closeBtn = document.querySelector('.close');

adminBtn.onclick = function() {
    modal.style.display = 'block';
}

closeBtn.onclick = function() {
    modal.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
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

function renderAdminTable() {
    const tableDiv = document.getElementById('adminTable');
    
    if (allEmployees.length === 0) {
        tableDiv.innerHTML = '<p style="text-align:center; padding:40px;">Нет данных. Ни один сотрудник ещё не заполнил расписание.</p>';
        return;
    }
    
    let html = '<div style="overflow-x:auto">';
    html += '<table>';
    html += '<thead><tr><th>Сотрудник</th>';
    
    for (let day of daysOfWeek) {
        html += `<th>${getFullDayName(day)}</th>`;
    }
    html += '</tr></thead><tbody>';
    
    for (let emp of allEmployees) {
        html += '<tr>';
        html += `<td><strong>${emp.fullName}</strong></td>`;
        for (let day of daysOfWeek) {
            let value = emp.schedule[day] || 'не указано';
            if (value === 'выходной') {
                value = '<span style="color:red;font-weight:bold;">🚫 Выходной</span>';
            }
            html += `<td>${value}</td>`;
        }
        html += '</tr>';
    }
    
    html += '</tbody></table></div>';
    tableDiv.innerHTML = html;
}

// ========== ЭКСПОРТ CSV (EXCEL) ==========
function downloadCSV() {
    if (allEmployees.length === 0) {
        alert('Нет данных для скачивания');
        return;
    }
    
    let rows = [['Сотрудник', ...daysOfWeek.map(d => getFullDayName(d))]];
    
    for (let emp of allEmployees) {
        let row = [emp.fullName];
        for (let day of daysOfWeek) {
            row.push(emp.schedule[day] || '');
        }
        rows.push(row);
    }
    
    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'rostics_raspisanie.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}



// ========== ПЕЧАТЬ ==========
function printTable() {
    const originalTitle = document.title;
    document.title = 'Rostic\'s - Таблица расписания';
    window.print();
    document.title = originalTitle;
}

// ========== ВЫХОД ИЗ АДМИНКИ ==========
function logoutAdmin() {
    showPage('page1');
    document.getElementById('adminLogin').value = '';
    document.getElementById('adminPassword').value = '';
}

// ========== ЗАПУСК ==========

// ========== СБРОС ВСЕХ ДАННЫХ (РАЗ В НЕДЕЛЮ) ==========
function resetAllData() {
    // Подтверждение от администратора (защита от случайного нажатия)
    const confirmReset = confirm(
        '⚠️ ВНИМАНИЕ! ⚠️\n\n' +
        'Вы уверены, что хотите удалить ВСЕ пожелания сотрудников?\n' +
        'Эти данные нельзя будет восстановить!\n\n' +
        'Рекомендуется перед сбросом скачать Excel-файл для архива.\n\n' +
        'Нажмите "ОК" для подтверждения сброса.'
    );
    
    if (!confirmReset) {
        return;  // Администратор передумал
    }
    
    // Второе подтверждение (двойная защита)
    const doubleConfirm = confirm(
        'Последнее предупреждение!\n\n' +
        'Все данные будут удалены навсегда.\n' +
        'Продолжить?'
    );
    
    if (!doubleConfirm) {
        return;
    }
    
    // Очищаем массив сотрудников
    allEmployees = [];
    
    // Сохраняем пустой массив в localStorage
    saveDataToStorage();
    
    // Обновляем таблицу на странице администратора
    renderAdminTable();
    
    // Показываем сообщение об успехе
    alert('✅ Все данные успешно сброшены!\n\nТеперь можно начинать сбор пожеланий на новую неделю.');
    
    // Дополнительно: очищаем текущего сотрудника, если он был
    currentEmployee = null;
    document.getElementById('employeeName').value = '';
}

loadData();