import './admin-style.css';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update } from "firebase/database";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA7irjSjANGeY4iZe80ZuOo_pr3aBhFi5s",
  authDomain: "rifa-smart-watch.firebaseapp.com",
  databaseURL: "https://rifa-smart-watch-default-rtdb.firebaseio.com",
  projectId: "rifa-smart-watch",
  storageBucket: "rifa-smart-watch.appspot.com",
  messagingSenderId: "916262944799",
  appId: "1:916262944799:web:8198492c24022ae398952a",
  measurementId: "G-YWMZ995XRK"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

class AdminRaffleApp {
  constructor() {
    this.participants = {};
    this.selectedNumber = null;
    this.pendingRegistrations = [];
    this.ticketPrice = 10000; // Precio por boleto en pesos
    this.initializeApp();
    this.setupFirebaseListener();
  }

  initializeApp() {
    this.renderApp();
    this.setupEventListeners();
  }

  setupFirebaseListener() {
    const rifaRef = ref(database, 'rifa');
    onValue(rifaRef, (snapshot) => {
      const data = snapshot.val();
      this.participants = data || {};
      this.renderApp();
      this.setupEventListeners();
    });
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      alert('¡Número copiado al portapapeles!');
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  }

  async saveParticipant(number, name, phone, paymentMethod = 'pendiente') {
    try {
      await set(ref(database, `rifa/${number}`), {
        name: name,
        phone: phone,
        paymentMethod: paymentMethod,
        timestamp: Date.now(),
        paid: paymentMethod !== 'pendiente'
      });
      return true;
    } catch (error) {
      console.error("Error guardando participante:", error);
      return false;
    }
  }

  async updatePaymentStatus(number, paymentMethod) {
    try {
      await update(ref(database, `rifa/${number}`), {
        paymentMethod: paymentMethod,
        paid: paymentMethod !== 'pendiente',
        paymentTimestamp: Date.now()
      });
      return true;
    } catch (error) {
      console.error("Error actualizando pago:", error);
      return false;
    }
  }

  calculateStats() {
    const participants = Object.values(this.participants);
    const totalSold = participants.length;
    const totalRevenue = totalSold * this.ticketPrice;
    
    // Contar por método de pago
    const nequiCount = participants.filter(p => p.paymentMethod === 'nequi').length;
    const efectivoCount = participants.filter(p => p.paymentMethod === 'efectivo').length;
    const pendienteCount = participants.filter(p => p.paymentMethod === 'pendiente').length;
    
    const nequiTotal = nequiCount * this.ticketPrice;
    const efectivoTotal = efectivoCount * this.ticketPrice;
    const pendienteTotal = pendienteCount * this.ticketPrice;
    
    const totalPaid = nequiTotal + efectivoTotal;
    const availableNumbers = 100 - totalSold;
    const soldPercentage = Math.round((totalSold / 100) * 100);

    return {
      totalSold,
      totalRevenue,
      totalPaid,
      pendingPayment: pendienteTotal,
      availableNumbers,
      soldPercentage,
      nequiCount,
      efectivoCount,
      pendienteCount,
      nequiTotal,
      efectivoTotal,
      pendienteTotal
    };
  }

  async confirmPendingRegistrations() {
    const button = document.getElementById('confirmButton');
    if (button) {
      button.disabled = true;
      button.textContent = 'Guardando...';
    }

    const successfulRegistrations = [];
    const failedRegistrations = [];

    for (const registration of this.pendingRegistrations) {
      try {
        const success = await this.saveParticipant(
          registration.number,
          registration.name,
          registration.phone,
          registration.paymentMethod || 'pendiente'
        );

        if (success) {
          successfulRegistrations.push(registration.number);
        } else {
          failedRegistrations.push(registration.number);
        }
      } catch (error) {
        console.error(`Error al guardar número ${registration.number}:`, error);
        failedRegistrations.push(registration.number);
      }
    }

    this.pendingRegistrations = failedRegistrations.map(number => 
      this.pendingRegistrations.find(reg => reg.number === number)
    );

    if (failedRegistrations.length > 0) {
      alert(`Error al guardar los números: ${failedRegistrations.join(', ')}`);
    }

    if (successfulRegistrations.length > 0) {
      alert(`Números registrados exitosamente: ${successfulRegistrations.join(', ')}`);
    }

    if (button) {
      button.disabled = false;
      button.textContent = 'Confirmar Registros';
    }

    this.selectedNumber = null;
    this.renderApp();
    this.setupEventListeners();
  }

  addPendingRegistration(number, name, phone, paymentMethod) {
    if (!name.trim() || !phone.trim()) {
      alert('Por favor complete todos los campos');
      return;
    }

    if (this.participants[number]) {
      alert('Este número ya está registrado');
      return;
    }

    if (this.pendingRegistrations.some(reg => reg.number === number)) {
      alert('Este número ya está pendiente de registro');
      return;
    }

    this.pendingRegistrations.push({
      number,
      name: name.trim(),
      phone: phone.trim(),
      paymentMethod: paymentMethod || 'pendiente',
      timestamp: Date.now()
    });

    this.renderApp();
    this.setupEventListeners();
  }

  renderApp() {
    const appElement = document.querySelector('#app');
    if (!appElement) return;

    const stats = this.calculateStats();

    appElement.innerHTML = `
      <div class="container">
        <header class="header">
          <h1>¡Gran Rifa de $1'000.000!</h1>
          <p>Sorteo: 20 de septiembre con los últimos dos números de la Lotería de Boyacá</p>
          <img src="https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg?auto=compress&cs=tinysrgb&w=300" 
               alt="Dinero" 
               class="smartwatch-image">
        </header>

        <div class="progress-section">
          <h2>Progreso de la Rifa</h2>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${stats.soldPercentage}%"></div>
            <span class="progress-text">${stats.totalSold} de 100 números vendidos (${stats.soldPercentage}%)</span>
          </div>
          <div class="available-numbers">
            <span>Números Disponibles: <strong class="highlight-red">${stats.availableNumbers}</strong></span>
          </div>
        </div>
        
        <div class="numbers-grid">
          ${this.generateNumbersGrid()}
        </div>

        <div class="payment-info">
          <p class="copy-number" data-number="3002183503">PUEDES PAGAR POR NEQUI AL NÚMERO <span class="number-highlight">3002183503</span> <span class="copy-icon">📋</span></p>
        </div>

        <div class="modal" id="registrationModal">
          <div class="modal-content">
            <h2>Registrar Número ${this.selectedNumber !== null ? this.selectedNumber.toString().padStart(2, '0') : ''}</h2>
            <form id="registrationForm">
              <div class="form-group">
                <label for="name">Nombre:</label>
                <input type="text" id="name" required>
              </div>
              <div class="form-group">
                <label for="phone">Teléfono:</label>
                <input type="tel" id="phone" required>
              </div>
              <div class="form-group">
                <label for="paymentMethod">Método de Pago:</label>
                <select id="paymentMethod" required>
                  <option value="pendiente">Pendiente</option>
                  <option value="nequi">Nequi</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              </div>
              <button type="submit" class="button">Agregar</button>
            </form>
          </div>
        </div>

        <div class="participants-list">
          <h2>Números Registrados</h2>
          
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-label">Total Vendido:</span>
              <span class="stat-value">$ ${stats.totalRevenue.toLocaleString()}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Total Nequi:</span>
              <span class="stat-value">$ ${stats.nequiTotal.toLocaleString()}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Total Efectivo:</span>
              <span class="stat-value">$ ${stats.efectivoTotal.toLocaleString()}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Pendiente:</span>
              <span class="stat-value pending">$ ${stats.pendienteTotal.toLocaleString()}</span>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-label">Pagos Nequi:</span>
              <span class="stat-value">${stats.nequiCount}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Pagos Efectivo:</span>
              <span class="stat-value">${stats.efectivoCount}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Sin Pagar:</span>
              <span class="stat-value pending">${stats.pendienteCount}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Total Pagado:</span>
              <span class="stat-value">$ ${stats.totalPaid.toLocaleString()}</span>
            </div>
          </div>

          <h3>Resumen de Participantes</h3>
          <table class="participants-table-summary">
            <thead>
              <tr>
                <th>Número</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Nequi</th>
                <th>Efectivo</th>
                <th>Pendiente</th>
              </tr>
            </thead>
            <tbody>
              ${this.generateParticipantsListSummary()}
            </tbody>
          </table>

          <h3>Control de Pagos - Datos Completos</h3>
          <table class="participants-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Nombre Completo</th>
                <th>Teléfono Completo</th>
                <th>Nequi</th>
                <th>Efectivo</th>
                <th>Pendiente</th>
              </tr>
            </thead>
            <tbody>
              ${this.generateCompleteParticipantsList()}
            </tbody>
          </table>
          
          ${this.pendingRegistrations.length > 0 ? `
            <div class="pending-registrations">
              <h3>Registros Pendientes de Confirmación</h3>
              <table class="participants-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Método de Pago</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.pendingRegistrations.map(reg => `
                    <tr>
                      <td>${reg.number}</td>
                      <td>${reg.name}</td>
                      <td>${reg.phone}</td>
                      <td>${reg.paymentMethod}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <button id="confirmButton" class="button confirm-button">
                Confirmar Registros (${this.pendingRegistrations.length})
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  generateNumbersGrid() {
    let grid = '';
    for (let i = 0; i < 100; i++) {
      const number = i.toString().padStart(2, '0');
      const isSelected = this.participants[number] !== undefined;
      const isPending = this.pendingRegistrations.some(reg => reg.number === number);
      grid += `
        <div class="number-cell ${isSelected ? 'selected' : ''} ${isPending ? 'pending' : ''}" 
             data-number="${number}">
          ${number}
        </div>
      `;
    }
    return grid;
  }

  generateParticipantsList() {
    return Object.entries(this.participants)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([number, data]) => `
        <tr>
          <td>${number}</td>
          <td>${this.maskName(data.name)}</td>
          <td>${this.maskPhone(data.phone)}</td>
          <td>
            <input type="radio" name="payment-${number}" value="nequi" 
                   ${data.paymentMethod === 'nequi' ? 'checked' : ''} 
                   onchange="window.raffleApp.updatePayment('${number}', 'nequi')">
          </td>
          <td>
            <input type="radio" name="payment-${number}" value="efectivo" 
                   ${data.paymentMethod === 'efectivo' ? 'checked' : ''} 
                   onchange="window.raffleApp.updatePayment('${number}', 'efectivo')">
          </td>
          <td>
            <input type="radio" name="payment-${number}" value="pendiente" 
                   ${data.paymentMethod === 'pendiente' ? 'checked' : ''} 
                   onchange="window.raffleApp.updatePayment('${number}', 'pendiente')">
          </td>
        </tr>
      `).join('');
  }

  generateParticipantsListSummary() {
    return Object.entries(this.participants)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([number, data]) => `
        <tr>
          <td>${number}</td>
          <td>${this.maskName(data.name)}</td>
          <td>${this.maskPhone(data.phone)}</td>
          <td>
            <input type="radio" name="payment-${number}" value="nequi" 
                   ${data.paymentMethod === 'nequi' ? 'checked' : ''} 
                   onchange="window.raffleApp.updatePayment('${number}', 'nequi')">
          </td>
          <td>
            <input type="radio" name="payment-${number}" value="efectivo" 
                   ${data.paymentMethod === 'efectivo' ? 'checked' : ''} 
                   onchange="window.raffleApp.updatePayment('${number}', 'efectivo')">
          </td>
          <td>
            <input type="radio" name="payment-${number}" value="pendiente" 
                   ${data.paymentMethod === 'pendiente' ? 'checked' : ''} 
                   onchange="window.raffleApp.updatePayment('${number}', 'pendiente')">
          </td>
        </tr>
      `).join('');
  }

  generateCompleteParticipantsList() {
    return Object.entries(this.participants)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([number, data]) => `
        <tr>
          <td>${number}</td>
          <td>${data.name}</td>
          <td>${data.phone}</td>
          <td>
            <input type="checkbox" ${data.paymentMethod === 'nequi' ? 'checked' : ''} 
                   onchange="window.raffleApp.updatePaymentCheckbox('${number}', 'nequi', this.checked)">
          </td>
          <td>
            <input type="checkbox" ${data.paymentMethod === 'efectivo' ? 'checked' : ''} 
                   onchange="window.raffleApp.updatePaymentCheckbox('${number}', 'efectivo', this.checked)">
          </td>
          <td>
            <input type="checkbox" ${data.paymentMethod === 'pendiente' ? 'checked' : ''} 
                   onchange="window.raffleApp.updatePaymentCheckbox('${number}', 'pendiente', this.checked)">
          </td>
        </tr>
      `).join('');
  }

  async updatePayment(number, paymentMethod) {
    await this.updatePaymentStatus(number, paymentMethod);
  }

  async updatePaymentCheckbox(number, paymentMethod, isChecked) {
    if (isChecked) {
      // Si se marca un checkbox, desmarcar los otros
      const checkboxes = document.querySelectorAll(`input[onchange*="'${number}'"]`);
      checkboxes.forEach(cb => {
        if (!cb.onchange.toString().includes(`'${paymentMethod}'`)) {
          cb.checked = false;
        }
      });
      await this.updatePaymentStatus(number, paymentMethod);
    } else {
      // Si se desmarca, poner como pendiente
      await this.updatePaymentStatus(number, 'pendiente');
    }
  }

  editParticipant(number) {
    const participant = this.participants[number];
    if (participant) {
      const newName = prompt('Nuevo nombre:', participant.name);
      const newPhone = prompt('Nuevo teléfono:', participant.phone);
      
      if (newName && newPhone) {
        this.updateParticipant(number, newName, newPhone);
      }
    }
  }

  async updateParticipant(number, name, phone) {
    try {
      await update(ref(database, `rifa/${number}`), {
        name: name,
        phone: phone,
        updateTimestamp: Date.now()
      });
    } catch (error) {
      console.error("Error actualizando participante:", error);
    }
  }

  setupEventListeners() {
    // Hacer la instancia disponible globalmente para los eventos inline
    window.raffleApp = this;

    // Configurar el evento de copiar número
    const copyNumberElement = document.querySelector('.copy-number');
    if (copyNumberElement) {
      copyNumberElement.addEventListener('click', () => {
        const number = copyNumberElement.dataset.number;
        this.copyToClipboard(number);
      });
    }

    // Remover listeners anteriores
    const oldConfirmButton = document.getElementById('confirmButton');
    if (oldConfirmButton) {
      oldConfirmButton.replaceWith(oldConfirmButton.cloneNode(true));
    }

    // Configurar nuevo listener para el botón de confirmar
    const confirmButton = document.getElementById('confirmButton');
    if (confirmButton) {
      confirmButton.addEventListener('click', () => this.confirmPendingRegistrations());
    }

    const modal = document.querySelector('#registrationModal');
    const form = document.querySelector('#registrationForm');

    // Configurar listeners para las celdas de números
    document.querySelectorAll('.number-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const number = e.target.dataset.number;
        if (!this.participants[number] && !this.pendingRegistrations.some(reg => reg.number === number)) {
          this.selectedNumber = number;
          if (modal) {
            modal.classList.add('active');
            if (form) form.reset();
          }
        }
      });
    });

    // Configurar listener para el formulario
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.querySelector('#name');
        const phoneInput = document.querySelector('#phone');
        const paymentMethodInput = document.querySelector('#paymentMethod');
        
        if (nameInput && phoneInput && paymentMethodInput) {
          this.addPendingRegistration(
            this.selectedNumber, 
            nameInput.value, 
            phoneInput.value,
            paymentMethodInput.value
          );
          if (modal) modal.classList.remove('active');
          form.reset();
        }
      });
    }

    // Configurar listener para cerrar el modal
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    }
  }
}

// Inicializar la aplicación
new AdminRaffleApp();