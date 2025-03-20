import './style.css';
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

class RaffleApp {
  constructor() {
    this.participants = {};
    this.selectedNumber = null;
    this.pendingRegistrations = [];
    this.TICKET_PRICE = 10000;
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

  async updatePaymentStatus(number, status) {
    try {
      if (!this.participants[number]) {
        console.error("Número no encontrado:", number);
        return false;
      }

      const updates = {};
      updates[`rifa/${number}`] = {
        ...this.participants[number],
        paymentStatus: status
      };

      await update(ref(database), updates);
      alert('Estado de pago actualizado correctamente');
      return true;
    } catch (error) {
      console.error("Error actualizando estado de pago:", error);
      alert('Error al actualizar el estado de pago: ' + error.message);
      return false;
    }
  }

  calculateTotals() {
    let totalPaid = 0;
    let totalPending = 0;

    Object.values(this.participants).forEach(participant => {
      if (participant.paymentStatus === 'nequi' || participant.paymentStatus === 'other') {
        totalPaid += this.TICKET_PRICE;
      } else {
        totalPending += this.TICKET_PRICE;
      }
    });

    return { totalPaid, totalPending };
  }

  calculateProgress() {
    const totalNumbers = 100;
    const soldNumbers = Object.keys(this.participants).length;
    const percentage = (soldNumbers / totalNumbers) * 100;
    
    let progressColor = '#ffd700'; // Amarillo por defecto
    if (percentage >= 80) {
      progressColor = '#2ecc71'; // Verde
    } else if (percentage >= 75) {
      progressColor = '#98fb98'; // Verde claro
    }

    return {
      percentage,
      sold: soldNumbers,
      total: totalNumbers,
      remaining: totalNumbers - soldNumbers,
      color: progressColor
    };
  }

  calculateTotalSales() {
    const soldNumbers = Object.values(this.participants).length;
    return soldNumbers * this.TICKET_PRICE;
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  async saveParticipant(number, name, phone) {
    try {
      await set(ref(database, `rifa/${number}`), {
        name: name,
        phone: phone,
        timestamp: Date.now(),
        paymentStatus: 'pending'
      });
      return true;
    } catch (error) {
      console.error("Error guardando participante:", error);
      return false;
    }
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
          registration.phone
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

  addPendingRegistration(number, name, phone) {
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
      timestamp: Date.now()
    });

    this.renderApp();
    this.setupEventListeners();
  }

  renderApp() {
    const appElement = document.querySelector('#app');
    if (!appElement) return;

    const totalSales = this.calculateTotalSales();
    const { totalPaid, totalPending } = this.calculateTotals();
    const progress = this.calculateProgress();

    appElement.innerHTML = `
      <div class="container">
        <header class="header">
          <h1>Control de Rifa Smartwatch</h1>
          <p>Panel de Administración</p>
        </header>
        
        <div class="numbers-grid">
          ${this.generateNumbersGrid()}
        </div>

        <div class="progress-container">
          <div class="progress-title">Progreso de la Rifa</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress.percentage}%; background-color: ${progress.color}"></div>
            <div class="progress-text">${progress.sold} de ${progress.total} números vendidos (${Math.round(progress.percentage)}%)</div>
          </div>
          <div class="progress-details">
            <p>Números Disponibles: <strong>${progress.remaining}</strong></p>
          </div>
        </div>

        <div class="payment-info">
          <p class="copy-number" data-number="3102583419">PUEDES PAGAR POR NEQUI AL NÚMERO <span class="number-highlight">3102583419</span> <span class="copy-icon">📋</span></p>
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
              <button type="submit" class="button">Agregar</button>
            </form>
          </div>
        </div>

        <div class="participants-list">
          <h2>Números Registrados</h2>
          <div class="sales-summary">
            <p>Total Vendido: <strong>${this.formatCurrency(totalSales)}</strong></p>
            <p>Total Pagos: <strong>${this.formatCurrency(totalPaid)}</strong></p>
            <p>Pendiente por Pagar: <strong>${this.formatCurrency(totalPending)}</strong></p>
            <p>Números Vendidos: <strong>${Object.keys(this.participants).length}</strong></p>
          </div>
          <table class="participants-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Nequi</th>
                <th>Otro</th>
                <th>Pendiente</th>
              </tr>
            </thead>
            <tbody>
              ${this.generateParticipantsList()}
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
                  </tr>
                </thead>
                <tbody>
                  ${this.pendingRegistrations.map(reg => `
                    <tr>
                      <td>${reg.number}</td>
                      <td>${reg.name}</td>
                      <td>${reg.phone}</td>
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
          <td>${data.name}</td>
          <td>${data.phone}</td>
          <td>
            <input type="radio" 
                   name="payment_${number}" 
                   value="nequi" 
                   ${data.paymentStatus === 'nequi' ? 'checked' : ''}
                   class="payment-radio"
                   data-number="${number}">
          </td>
          <td>
            <input type="radio" 
                   name="payment_${number}" 
                   value="other" 
                   ${data.paymentStatus === 'other' ? 'checked' : ''}
                   class="payment-radio"
                   data-number="${number}">
          </td>
          <td>
            <input type="radio" 
                   name="payment_${number}" 
                   value="pending" 
                   ${!data.paymentStatus || data.paymentStatus === 'pending' ? 'checked' : ''}
                   class="payment-radio"
                   data-number="${number}">
          </td>
        </tr>
      `).join('');
  }

  setupEventListeners() {
    const copyNumberElement = document.querySelector('.copy-number');
    if (copyNumberElement) {
      copyNumberElement.addEventListener('click', () => {
        const number = copyNumberElement.dataset.number;
        this.copyToClipboard(number);
      });
    }

    document.querySelectorAll('.payment-radio').forEach(radio => {
      radio.addEventListener('change', async (e) => {
        const number = e.target.dataset.number;
        const status = e.target.value;
        await this.updatePaymentStatus(number, status);
      });
    });

    const oldConfirmButton = document.getElementById('confirmButton');
    if (oldConfirmButton) {
      oldConfirmButton.replaceWith(oldConfirmButton.cloneNode(true));
    }

    const confirmButton = document.getElementById('confirmButton');
    if (confirmButton) {
      confirmButton.addEventListener('click', () => this.confirmPendingRegistrations());
    }

    const modal = document.querySelector('#registrationModal');
    const form = document.querySelector('#registrationForm');

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

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.querySelector('#name');
        const phoneInput = document.querySelector('#phone');
        
        if (nameInput && phoneInput) {
          this.addPendingRegistration(this.selectedNumber, nameInput.value, phoneInput.value);
          if (modal) modal.classList.remove('active');
          form.reset();
        }
      });
    }

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
new RaffleApp();