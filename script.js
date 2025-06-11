const calendar = document.getElementById('calendar');
const monthYear = document.getElementById('monthYear');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const eventModal = document.getElementById('eventModal');
const closeBtn = document.querySelector('.close-button');
const eventForm = document.getElementById('eventForm');
const eventDateInput = document.getElementById('eventDate');
const eventTitleInput = document.getElementById('eventTitle');
const eventDescInput = document.getElementById('eventDescription');
const eventIdInput = document.getElementById('eventId');
const deleteEventBtn = document.getElementById('deleteEvent');
const exportPDFBtn = document.getElementById('exportPDF');

let currentDate = new Date();
let db;

window.onload = () => {
  initDB();
  renderCalendar();
};

function initDB() {
  const request = indexedDB.open('agendaDB', 1);
  request.onupgradeneeded = e => {
    db = e.target.result;
    db.createObjectStore('eventos', { keyPath: 'id', autoIncrement: true });
  };
  request.onsuccess = e => {
    db = e.target.result;
    renderCalendar();
  };
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const monthName = firstDay.toLocaleString('default', { month: 'long' });
  monthYear.textContent = `${monthName.toUpperCase()} ${year}`;
  calendar.innerHTML = '';

  for (let i = 1; i <= lastDay.getDate(); i++) {
    const dayDiv = document.createElement('div');
    dayDiv.classList.add('calendar-day');
    dayDiv.innerHTML = `<span class="day-number">${i}</span>`;
    dayDiv.dataset.date = `${year}-${month + 1}-${i}`;
    dayDiv.addEventListener('click', openModal);
    calendar.appendChild(dayDiv);
  }
  loadEvents();
}

function openModal(e) {
  const date = e.currentTarget.dataset.date;
  eventDateInput.value = date;
  eventIdInput.value = '';
  eventTitleInput.value = '';
  eventDescInput.value = '';
  deleteEventBtn.style.display = 'none';

  getEventByDate(date, data => {
    if (data) {
      eventIdInput.value = data.id;
      eventTitleInput.value = data.titulo;
      eventDescInput.value = data.descricao;
      deleteEventBtn.style.display = 'block';
    }
  });

  eventModal.classList.remove('hidden');
}

closeBtn.onclick = () => eventModal.classList.add('hidden');

eventForm.onsubmit = e => {
  e.preventDefault();
  const id = parseInt(eventIdInput.value);
  const data = {
    id: id || undefined,
    data: eventDateInput.value,
    titulo: eventTitleInput.value,
    descricao: eventDescInput.value
  };
  saveEvent(data);
  eventModal.classList.add('hidden');
};

deleteEventBtn.onclick = () => {
  const id = parseInt(eventIdInput.value);
  deleteEvent(id);
  eventModal.classList.add('hidden');
};

function saveEvent(evento) {
  const tx = db.transaction(['eventos'], 'readwrite');
  const store = tx.objectStore('eventos');
  evento.id ? store.put(evento) : store.add(evento);
  tx.oncomplete = () => renderCalendar();
}

function deleteEvent(id) {
  const tx = db.transaction(['eventos'], 'readwrite');
  tx.objectStore('eventos').delete(id);
  tx.oncomplete = () => renderCalendar();
}

function getEventByDate(date, callback) {
  const tx = db.transaction(['eventos'], 'readonly');
  const store = tx.objectStore('eventos');
  const req = store.openCursor();
  req.onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      if (cursor.value.data === date) return callback(cursor.value);
      cursor.continue();
    } else {
      callback(null);
    }
  };
}

function loadEvents() {
  const tx = db.transaction(['eventos'], 'readonly');
  const store = tx.objectStore('eventos');
  const req = store.openCursor();
  req.onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      const day = document.querySelector(`[data-date='${cursor.value.data}']`);
      if (day) {
        day.innerHTML += `<div class='event-title'>📌 ${cursor.value.titulo}</div>`;
      }
      cursor.continue();
    }
  };
}

prevMonthBtn.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

nextMonthBtn.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};

exportPDFBtn.onclick = () => {
  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write('<html><head><title>Relatório de Eventos</title>');
  printWindow.document.write('<style>body { font-family: Arial; padding: 20px; } h2 { text-align: center; } .evento { margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }</style>');
  printWindow.document.write('</head><body>');
  printWindow.document.write(`<h2>Relatório - ${monthYear.textContent}</h2>`);

  const tx = db.transaction(['eventos'], 'readonly');
  const store = tx.objectStore('eventos');
  const req = store.openCursor();
  req.onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      const ev = cursor.value;
      const data = new Date(ev.data);
      if (data.getMonth() === currentDate.getMonth()) {
        printWindow.document.write(`<div class='evento'><strong>Data:</strong> ${ev.data}<br><strong>Título:</strong> ${ev.titulo}<br><strong>Descrição:</strong> ${ev.descricao}</div>`);
      }
      cursor.continue();
    } else {
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };
};
