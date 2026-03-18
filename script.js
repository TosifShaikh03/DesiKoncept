import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  addDoc,
  Timestamp,
  getDoc,
  deleteDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ========== FIREBASE CONFIGURATION ==========
const firebaseConfig = {
  apiKey: "AIzaSyAUOToZY7XElolSapVZd_j3Mx5-0gsWKuQ",
  authDomain: "desikoncept-f5742.firebaseapp.com",
  projectId: "desikoncept-f5742",
  storageBucket: "desikoncept-f5742.firebasestorage.app",
  messagingSenderId: "24457513762",
  appId: "1:24457513762:web:cc14206c3bcc59d4b7b37b",
  measurementId: "G-FMNCW5P0T1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

console.log("Firebase initialized successfully!");

// ========== RAZORPAY CONFIGURATION ==========
// IMPORTANT: Replace with your actual Razorpay test/live keys
// const RAZORPAY_CONFIG = {
//   key: "rzp_test_YOUR_TEST_KEY_HERE", // Replace with your test key
//   // For production: key: "rzp_live_YOUR_LIVE_KEY_HERE",
//   currency: "INR",
//   name: "desiKONCEPT",
//   description: "Premium Muesli Products",
//   image: "https://www.desikoncept.in/wp-content/uploads/sites/6/2025/12/cropped-Logo-1.png",
//   theme: {
//     color: "#b47d5a"
//   }
// };

// Admin emails
const ADMIN_EMAILS = [
  'admin@gmail.com'
];

// ========== STATE MANAGEMENT ==========
let allProducts = [];
let orders = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let displayedProducts = [];
let currentUser = null;
let isLoginMode = true;
let isAdmin = false;
let currentEditProduct = null;
let selectedPaymentMethod = 'cod';

// ========== DOM ELEMENTS ==========
const productGrid = document.getElementById('productGrid');
const cartCountSpan = document.getElementById('cartCount');
const loginBtn = document.getElementById('loginBtn');
const userName = document.getElementById('userName');
const homePage = document.getElementById('homePage');
const productDetail = document.getElementById('productDetail');
const productDetailContent = document.getElementById('productDetailContent');
const homeLogo = document.getElementById('homeLogo');
const cartSidebar = document.getElementById('cartSidebar');
const cartToggle = document.getElementById('cartToggle');
const closeCart = document.getElementById('closeCart');
const overlay = document.getElementById('overlay');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const adminPanel = document.getElementById('adminPanel');
const adminToggle = document.getElementById('adminToggle');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const checkoutModal = document.getElementById('checkoutModal');
const checkoutContent = document.getElementById('checkoutContent');

// Admin panel elements
const totalProducts = document.getElementById('totalProducts');
const totalOrders = document.getElementById('totalOrders');
const totalUsers = document.getElementById('totalUsers');
const totalRevenue = document.getElementById('totalRevenue');
const adminProductsList = document.getElementById('adminProductsList');
const adminOrdersList = document.getElementById('adminOrdersList');
const adminUsersList = document.getElementById('adminUsersList');

// Auth modal elements
const authModal = document.getElementById('authModal');
const closeAuthModal = document.getElementById('closeAuthModal');
const authModalTitle = document.getElementById('authModalTitle');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authName = document.getElementById('authName');
const nameFieldGroup = document.getElementById('nameFieldGroup');
const authActionBtn = document.getElementById('authActionBtn');
const authToggle = document.getElementById('authToggle');
const authError = document.getElementById('authError');

// Slideshow elements
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
const prevBtn = document.getElementById('prevSlide');
const nextBtn = document.getElementById('nextSlide');
let currentSlide = 0;
let slideInterval;

// ========== SLIDESHOW FUNCTIONS ==========
function showSlide(index) {
  if (index >= slides.length) index = 0;
  if (index < 0) index = slides.length - 1;

  slides.forEach((s, i) => {
    s.classList.toggle('active', i === index);
  });

  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });

  currentSlide = index;
}

function nextSlide() { showSlide(currentSlide + 1); }
function prevSlide() { showSlide(currentSlide - 1); }

function startSlideshow() {
  slideInterval = setInterval(nextSlide, 4000);
}

if (prevBtn && nextBtn) {
  prevBtn.addEventListener('click', () => {
    prevSlide();
    clearInterval(slideInterval);
    startSlideshow();
  });

  nextBtn.addEventListener('click', () => {
    nextSlide();
    clearInterval(slideInterval);
    startSlideshow();
  });
}

dots.forEach((dot, i) => {
  dot.addEventListener('click', () => {
    showSlide(i);
    clearInterval(slideInterval);
    startSlideshow();
  });
});

showSlide(0);
startSlideshow();

// ========== FIREBASE DATA LOADING ==========
async function loadProducts() {
  try {
    const productsSnapshot = await getDocs(collection(db, "products"));
    if (!productsSnapshot.empty) {
      allProducts = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      displayedProducts = [...allProducts];
      renderProducts();
      if (isAdmin) updateAdminProducts();
    } else {
      // No products in database yet
      allProducts = [];
      displayedProducts = [];
      productGrid.innerHTML = '<p style="text-align: center; padding: 3rem; color: #70655c;">No products available yet. Admin can add products.</p>';
    }
  } catch (error) {
    console.error("Error loading products:", error);
    productGrid.innerHTML = '<p style="text-align: center; padding: 3rem; color: #ff6b6b;">Error loading products. Please refresh the page.</p>';
  }
}

async function loadOrders() {
  try {
    const ordersSnapshot = await getDocs(collection(db, "orders"));
    orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (isAdmin && adminOrdersList) {
      if (orders.length === 0) {
        adminOrdersList.innerHTML = '<tr><td colspan="7" style="text-align: center;">No orders yet</td></tr>';
      } else {
        adminOrdersList.innerHTML = orders.map(order => `
            <tr>
              <td>#${order.id.slice(-6)}</td>
              <td>${order.customerName}</td>
              <td>${new Date(order.date).toLocaleString()}</td>
              <td>₹${order.total.toFixed(2)}</td>
              <td><span class="admin-badge-small" style="background: ${order.paymentMethod === 'cod' ? '#ff9800' : '#4CAF50'};">${order.paymentMethod.toUpperCase()}</span></td>
              <td><span class="admin-badge-small" style="background: #4CAF50;">${order.status}</span></td>
              <td>${order.items.length} items</td>
            </tr>
          `).join('');
      }
    }
  } catch (error) {
    console.error("Error loading orders:", error);
  }
}

async function loadUsers() {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    let usersHtml = '';
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      const isAdminUser = ADMIN_EMAILS.includes(user.email);
      usersHtml += `
          <tr>
            <td>${user.name || 'N/A'}</td>
            <td>${user.email}</td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>${isAdminUser ? '<span class="admin-badge-small">Admin</span>' : 'User'}</td>
          </tr>
        `;
    });
    adminUsersList.innerHTML = usersHtml || '<tr><td colspan="4" style="text-align: center;">No users found</td></tr>';
  } catch (error) {
    console.error("Error loading users:", error);
    adminUsersList.innerHTML = '<tr><td colspan="4" style="text-align: center;">Error loading users</td></tr>';
  }
}

// ========== ADMIN FUNCTIONS ==========
function checkAdminStatus(user) {
  if (!user) {
    isAdmin = false;
    adminToggle.style.display = 'none';
    return;
  }

  if (ADMIN_EMAILS.includes(user.email)) {
    isAdmin = true;
    adminToggle.style.display = 'inline-flex';
    console.log('Admin access granted for:', user.email);
  } else {
    isAdmin = false;
    adminToggle.style.display = 'none';
  }
}

window.showAdminPanel = function () {
  if (!isAdmin) {
    alert('Access denied. Admin privileges required.');
    return;
  }
  homePage.classList.add('hidden');
  productDetail.classList.remove('active');
  adminPanel.style.display = 'block';
  updateAdminStats();
  updateAdminProducts();
  loadUsers();
  loadOrders();
};

window.switchAdminTab = function (tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-content').forEach(c => c.style.display = 'none');

  if (tab === 'products') {
    document.querySelectorAll('.admin-tab')[0].classList.add('active');
    document.getElementById('adminProducts').style.display = 'block';
    updateAdminProducts();
  } else if (tab === 'orders') {
    document.querySelectorAll('.admin-tab')[1].classList.add('active');
    document.getElementById('adminOrders').style.display = 'block';
    loadOrders();
  } else if (tab === 'users') {
    document.querySelectorAll('.admin-tab')[2].classList.add('active');
    document.getElementById('adminUsers').style.display = 'block';
    loadUsers();
  }
};

function updateAdminStats() {
  totalProducts.textContent = allProducts.length;
  totalOrders.textContent = orders.length;

  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  totalRevenue.textContent = `₹${revenue.toFixed(2)}`;

  const uniqueUsers = new Set(orders.map(o => o.userId)).size;
  totalUsers.textContent = uniqueUsers || '1';
}

function updateAdminProducts() {
  adminProductsList.innerHTML = allProducts.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>₹${p.price}</td>
        <td>${p.category}</td>
        <td>${p.stock || 0}</td>
        <td class="admin-actions">
          <button class="admin-btn" onclick="window.openEditModal('${p.id}')">Edit</button>
          <button class="admin-btn delete" onclick="window.deleteProduct('${p.id}')">Delete</button>
        </td>
      </tr>
    `).join('');
}

// Image preview function
window.previewImage = function (input, previewId) {
  const preview = document.getElementById(previewId);
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(input.files[0]);
  } else {
    preview.innerHTML = '<i class="fas fa-image"></i>';
  }
};

// Upload image to Firebase Storage
async function uploadProductImage(file) {
  if (!file) return null;

  try {
    const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    alert("Error uploading image. Please try again.");
    return null;
  }
}

window.addNewProduct = async function () {
  if (!isAdmin) return;

  const name = document.getElementById('newProductName').value;
  const price = parseFloat(document.getElementById('newProductPrice').value);
  const originalPrice = parseFloat(document.getElementById('newProductOriginalPrice').value);
  const category = document.getElementById('newProductCategory').value;
  const shortDesc = document.getElementById('newProductShortDesc').value;
  const longDesc = document.getElementById('newProductLongDesc').value;
  const imageFile = document.getElementById('newProductImage').files[0];

  if (!name || !price || !originalPrice) {
    alert('Please fill in all required fields');
    return;
  }

  try {
    // Upload image if provided
    let imageUrl = '';
    if (imageFile) {
      imageUrl = await uploadProductImage(imageFile);
    }

    // Create product in Firestore
    const productData = {
      name: name,
      description: shortDesc || name,
      longDescription: longDesc || shortDesc || name,
      price: price,
      originalPrice: originalPrice,
      discount: Math.round(((originalPrice - price) / originalPrice) * 100),
      image: imageUrl || '',
      category: category,
      stock: 50,
      nutrition: {
        calories: 350,
        protein: '10g',
        carbs: '60g',
        fiber: '7g',
        fat: '8g'
      },
      images: imageUrl ? [imageUrl] : [],
      reviews: [],
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, "products"), productData);

    // Add to local array with ID
    const newProduct = {
      id: docRef.id,
      ...productData
    };

    allProducts.push(newProduct);
    displayedProducts = [...allProducts];
    renderProducts();
    updateAdminProducts();
    updateAdminStats();

    // Clear form
    document.getElementById('newProductName').value = '';
    document.getElementById('newProductPrice').value = '';
    document.getElementById('newProductOriginalPrice').value = '';
    document.getElementById('newProductShortDesc').value = '';
    document.getElementById('newProductLongDesc').value = '';
    document.getElementById('newProductImage').value = '';
    document.getElementById('newProductImagePreview').innerHTML = '<i class="fas fa-image"></i>';

    alert('Product added successfully!');
  } catch (error) {
    console.error("Error adding product:", error);
    alert("Error adding product. Please try again.");
  }
};

// Edit Product Functions
window.openEditModal = function (productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  currentEditProduct = product;

  editForm.innerHTML = `
      <div class="form-grid">
        <div class="form-group">
          <label>Product Name</label>
          <input type="text" id="editProductName" value="${product.name}">
        </div>
        <div class="form-group">
          <label>Price (₹)</label>
          <input type="number" id="editProductPrice" step="0.1" value="${product.price}">
        </div>
        <div class="form-group">
          <label>Original Price (₹)</label>
          <input type="number" id="editProductOriginalPrice" step="0.1" value="${product.originalPrice}">
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="editProductCategory">
            <option value="sweet" ${product.category === 'sweet' ? 'selected' : ''}>Sweet</option>
            <option value="savoury" ${product.category === 'savoury' ? 'selected' : ''}>Savoury</option>
            <option value="neutral" ${product.category === 'neutral' ? 'selected' : ''}>Neutral</option>
          </select>
        </div>
        <div class="form-group">
          <label>Product Image</label>
          <div class="image-preview" id="editProductImagePreview">
            ${product.image ? `<img src="${product.image}" alt="Current">` : '<i class="fas fa-image"></i>'}
          </div>
          <div class="file-input">
            <input type="file" id="editProductImage" accept="image/*" onchange="window.previewImage(this, 'editProductImagePreview')">
          </div>
        </div>
        <div class="form-group">
          <label>Stock</label>
          <input type="number" id="editProductStock" value="${product.stock || 0}">
        </div>
        <div class="form-group">
          <label>Short Description</label>
          <input type="text" id="editProductShortDesc" value="${product.description}">
        </div>
        <div class="form-group full-width">
          <label>Long Description</label>
          <textarea id="editProductLongDesc" rows="3">${product.longDescription}</textarea>
        </div>
      </div>
      <button class="submit-btn" onclick="window.saveProductChanges()">Save Changes</button>
    `;

  editModal.classList.add('open');
  overlay.classList.add('show');
};

window.closeEditModal = function () {
  editModal.classList.remove('open');
  overlay.classList.remove('show');
  currentEditProduct = null;
};

window.saveProductChanges = async function () {
  if (!isAdmin || !currentEditProduct) return;

  const name = document.getElementById('editProductName').value;
  const price = parseFloat(document.getElementById('editProductPrice').value);
  const originalPrice = parseFloat(document.getElementById('editProductOriginalPrice').value);
  const category = document.getElementById('editProductCategory').value;
  const stock = parseInt(document.getElementById('editProductStock').value);
  const shortDesc = document.getElementById('editProductShortDesc').value;
  const longDesc = document.getElementById('editProductLongDesc').value;
  const imageFile = document.getElementById('editProductImage').files[0];

  if (!name || !price || !originalPrice) {
    alert('Please fill in all required fields');
    return;
  }

  try {
    // Upload new image if provided
    let imageUrl = currentEditProduct.image;
    if (imageFile) {
      imageUrl = await uploadProductImage(imageFile);
    }

    // Update in Firestore
    const productRef = doc(db, "products", currentEditProduct.id);
    await updateDoc(productRef, {
      name: name,
      description: shortDesc,
      longDescription: longDesc,
      price: price,
      originalPrice: originalPrice,
      discount: Math.round(((originalPrice - price) / originalPrice) * 100),
      category: category,
      stock: stock,
      image: imageUrl
    });

    // Update local array
    const index = allProducts.findIndex(p => p.id === currentEditProduct.id);
    if (index !== -1) {
      allProducts[index] = {
        ...allProducts[index],
        name: name,
        description: shortDesc,
        longDescription: longDesc,
        price: price,
        originalPrice: originalPrice,
        discount: Math.round(((originalPrice - price) / originalPrice) * 100),
        category: category,
        stock: stock,
        image: imageUrl
      };

      displayedProducts = [...allProducts];
      renderProducts();
      updateAdminProducts();
      updateAdminStats();
    }

    window.closeEditModal();
    alert('Product updated successfully!');
  } catch (error) {
    console.error("Error updating product:", error);
    alert("Error updating product. Please try again.");
  }
};

window.deleteProduct = async function (productId) {
  if (!isAdmin) return;
  if (confirm('Are you sure you want to delete this product?')) {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "products", productId));

      // Remove from local array
      allProducts = allProducts.filter(p => p.id !== productId);
      displayedProducts = [...allProducts];
      renderProducts();
      updateAdminProducts();
      updateAdminStats();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Error deleting product. Please try again.");
    }
  }
};

// ========== RAZORPAY PAYMENT FUNCTION ==========
function initiateRazorpayPayment(orderId, amount) {
  return new Promise((resolve, reject) => {
    const options = {
      key: RAZORPAY_CONFIG.key,
      amount: Math.round(amount * 100),
      currency: RAZORPAY_CONFIG.currency,
      name: RAZORPAY_CONFIG.name,
      description: RAZORPAY_CONFIG.description,
      image: RAZORPAY_CONFIG.image,
      prefill: {
        name: currentUser?.displayName || "",
        email: currentUser?.email || "",
        contact: ""
      },
      theme: RAZORPAY_CONFIG.theme,
      handler: function (response) {
        resolve({
          success: true,
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature
        });
      },
      modal: {
        ondismiss: function () {
          reject(new Error("Payment cancelled"));
        }
      }
    };

    const razorpay = new Razorpay(options);
    razorpay.open();
  });
}

// ========== CHECKOUT FUNCTIONS ==========
window.openCheckoutModal = function () {
  if (!currentUser) {
    alert('Please sign in to checkout');
    return;
  }

  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  checkoutContent.innerHTML = `
      <h2>Checkout</h2>
      <div class="checkout-summary">
        <h3>Order Summary</h3>
        ${cart.map(item => `
          <div class="checkout-item">
            <span>${item.name} x${item.qty}</span>
            <span>₹${(item.price * item.qty).toFixed(2)}</span>
          </div>
        `).join('')}
        <div class="checkout-total">
          <span>Total</span>
          <span>₹${total.toFixed(2)}</span>
        </div>
      </div>
      
      <h3>Payment Method</h3>
      <div class="payment-methods">
        <div class="payment-method ${selectedPaymentMethod === 'cod' ? 'selected' : ''}" onclick="window.selectPaymentMethod('cod')">
          <i class="fas fa-money-bill-wave"></i>
          <p>Cash on Delivery</p>
        </div>
        <div class="payment-method ${selectedPaymentMethod === 'card' ? 'selected' : ''}" onclick="window.selectPaymentMethod('card')">
          <i class="fas fa-credit-card"></i>
          <p>Credit/Debit Card</p>
        </div>
        <div class="payment-method ${selectedPaymentMethod === 'upi' ? 'selected' : ''}" onclick="window.selectPaymentMethod('upi')">
          <i class="fas fa-mobile-alt"></i>
          <p>UPI</p>
        </div>
      </div>
      
      <button class="submit-btn" onclick="window.processPayment()">
        ${selectedPaymentMethod === 'cod' ? 'Place Order' : 'Pay Now'} · ₹${total.toFixed(2)}
      </button>
    `;

  checkoutModal.classList.add('open');
  overlay.classList.add('show');
  cartSidebar.classList.remove('open');
};

window.selectPaymentMethod = function (method) {
  selectedPaymentMethod = method;
  window.openCheckoutModal();
};

window.processPayment = async function () {
  if (!currentUser) return;

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const orderId = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

  try {
    if (selectedPaymentMethod === 'cod') {
      await placeOrder(orderId, total, 'cod', 'Confirmed');
    } else {
      checkoutContent.innerHTML = `
          <div class="order-success">
            <i class="fas fa-spinner fa-pulse"></i>
            <h3>Redirecting to Payment Gateway...</h3>
            <p>Please do not close this window</p>
          </div>
        `;

      try {
        const paymentResult = await initiateRazorpayPayment(orderId, total);
        await placeOrder(orderId, total, selectedPaymentMethod, 'Paid', paymentResult.paymentId);
      } catch (paymentError) {
        console.error("Payment failed:", paymentError);
        checkoutContent.innerHTML = `
            <div class="order-success">
              <i class="fas fa-times-circle" style="color: #ff6b6b;"></i>
              <h3>Payment Failed</h3>
              <p>${paymentError.message || 'Transaction was cancelled or failed'}</p>
              <button class="submit-btn" onclick="window.openCheckoutModal()">Try Again</button>
              <button class="submit-btn" style="background: #999; margin-top: 1rem;" onclick="window.closeCheckoutModal()">Cancel</button>
            </div>
          `;
        return;
      }
    }
  } catch (error) {
    console.error("Error processing order:", error);
    alert('Error processing order. Please try again.');
  }
};

async function placeOrder(orderId, total, paymentMethod, status, paymentId = null) {
  const order = {
    id: orderId,
    userId: currentUser.uid,
    customerName: currentUser.displayName || currentUser.email.split('@')[0],
    customerEmail: currentUser.email,
    items: cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: item.qty,
      image: item.image
    })),
    total: total,
    paymentMethod: paymentMethod,
    paymentId: paymentId,
    status: status,
    date: new Date().toISOString(),
    timestamp: Timestamp.now()
  };

  try {
    // Save to Firestore
    await addDoc(collection(db, "orders"), order);

    // Update local orders
    orders.push(order);

    // Clear cart
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();

    // Show success message
    checkoutContent.innerHTML = `
        <div class="order-success">
          <i class="fas fa-check-circle"></i>
          <h3>Order Placed Successfully!</h3>
          <p>Order ID: ${orderId}</p>
          ${paymentId ? `<p>Payment ID: ${paymentId}</p>` : ''}
          <p>Thank you for shopping with desiKONCEPT!</p>
          <button class="submit-btn" onclick="window.closeCheckoutModal()">Continue Shopping</button>
        </div>
      `;

    // Update admin stats if admin panel is open
    if (isAdmin) {
      updateAdminStats();
      loadOrders();
    }

  } catch (error) {
    console.error("Error placing order:", error);
    throw error;
  }
}

window.closeCheckoutModal = function () {
  checkoutModal.classList.remove('open');
  overlay.classList.remove('show');
  selectedPaymentMethod = 'cod';
};

// ========== AUTHENTICATION FUNCTIONS ==========
async function updateAuthUI(user) {
  if (user) {
    currentUser = user;
    const displayName = user.displayName || user.email.split('@')[0];
    userName.textContent = displayName;
    loginBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign Out';

    checkAdminStatus(user);
  } else {
    currentUser = null;
    userName.textContent = '';
    loginBtn.innerHTML = '<i class="far fa-user"></i> Sign in';
    isAdmin = false;
    adminToggle.style.display = 'none';
    adminPanel.style.display = 'none';
    homePage.classList.remove('hidden');
    window.closeEditModal();
    window.closeCheckoutModal();
  }
  updateCheckoutButton();
}

function updateCheckoutButton() {
  if (checkoutBtn) {
    checkoutBtn.disabled = !currentUser;
    checkoutBtn.title = currentUser ? '' : 'Please sign in to checkout';
  }
}

function showAuthModal() {
  authModal.classList.add('open');
  authEmail.value = '';
  authPassword.value = '';
  authName.value = '';
  authError.textContent = '';
  nameFieldGroup.style.display = isLoginMode ? 'none' : 'block';
}

function hideAuthModal() {
  authModal.classList.remove('open');
}

async function handleAuth() {
  const email = authEmail.value.trim();
  const password = authPassword.value;
  const name = authName.value.trim();

  if (!email || !password) {
    authError.textContent = 'Please fill in all fields';
    return;
  }

  if (!isLoginMode && !name) {
    authError.textContent = 'Please enter your name';
    return;
  }

  try {
    if (isLoginMode) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(userCredential.user, {
        displayName: name
      });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: name,
        email: email,
        createdAt: new Date().toISOString(),
        cart: []
      });
    }
    hideAuthModal();
  } catch (error) {
    console.error('Auth error:', error);
    switch (error.code) {
      case 'auth/email-already-in-use':
        authError.textContent = 'Email already in use. Please sign in instead.';
        break;
      case 'auth/invalid-email':
        authError.textContent = 'Please enter a valid email address';
        break;
      case 'auth/weak-password':
        authError.textContent = 'Password should be at least 6 characters';
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        authError.textContent = 'Invalid email or password';
        break;
      default:
        authError.textContent = 'Authentication failed. Please try again.';
    }
  }
}

// ========== AUTH STATE OBSERVER ==========
onAuthStateChanged(auth, (user) => {
  updateAuthUI(user);
});

// ========== EVENT LISTENERS ==========
loginBtn.addEventListener('click', () => {
  if (currentUser) {
    signOut(auth).catch(console.error);
  } else {
    isLoginMode = true;
    authModalTitle.textContent = 'Sign In';
    authActionBtn.textContent = 'Sign In';
    authToggle.textContent = "Don't have an account? Sign Up";
    nameFieldGroup.style.display = 'none';
    showAuthModal();
  }
});

authToggle.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  authModalTitle.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
  authActionBtn.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
  authToggle.textContent = isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Sign In";
  nameFieldGroup.style.display = isLoginMode ? 'none' : 'block';
  authError.textContent = '';
});

authActionBtn.addEventListener('click', handleAuth);
closeAuthModal.addEventListener('click', hideAuthModal);

window.addEventListener('click', (e) => {
  if (e.target === authModal) {
    hideAuthModal();
  }
  if (e.target === editModal) {
    window.closeEditModal();
  }
  if (e.target === checkoutModal) {
    window.closeCheckoutModal();
  }
});

authPassword.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleAuth();
  }
});

adminToggle.addEventListener('click', window.showAdminPanel);
checkoutBtn.addEventListener('click', window.openCheckoutModal);

// ========== PRODUCT FUNCTIONS ==========
window.showHome = function () {
  homePage.classList.remove('hidden');
  productDetail.classList.remove('active');
  adminPanel.style.display = 'none';
  window.closeEditModal();
  window.closeCheckoutModal();
};

window.filterByCategory = function (category) {
  displayedProducts = allProducts.filter(p => p.category === category);
  renderProducts();
  showHome();
};

window.showProductDetail = function (productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  homePage.classList.add('hidden');
  productDetail.classList.add('active');
  adminPanel.style.display = 'none';

  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  const thumbnails = (product.images && product.images.length > 0)
    ? product.images.map((img, index) => `
          <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="window.changeMainImage(this, '${img}')">
            <img src="${img}" alt="Thumbnail">
          </div>
        `).join('')
    : `<div class="thumbnail active">
          <img src="${product.image}" alt="Thumbnail">
        </div>`;

  const reviews = product.reviews && product.reviews.length > 0
    ? product.reviews.map(review => `
          <div class="review-card">
            <div class="review-header">
              <div class="reviewer-avatar">${review.avatar || '👤'}</div>
              <div class="reviewer-info">
                <h4>${review.name}</h4>
                <p>${review.date || 'Recently'}</p>
              </div>
            </div>
            <div class="review-rating">
              ${Array(review.rating).fill('<i class="fas fa-star"></i>').join('')}
              ${Array(5 - review.rating).fill('<i class="far fa-star"></i>').join('')}
            </div>
            <p class="review-text">${review.comment}</p>
          </div>
        `).join('')
    : '<p>No reviews yet. Be the first to review!</p>';

  productDetailContent.innerHTML = `
      <div class="product-detail">
        <div class="product-detail-images">
          <div class="main-image" id="mainProductImage">
            <img src="${product.images && product.images[0] ? product.images[0] : product.image}" alt="${product.name}">
          </div>
          <div class="thumbnail-images">
            ${thumbnails}
          </div>
        </div>
        <div class="product-detail-info">
          <h1>${product.name}</h1>
          <div class="product-detail-prices">
            <span class="product-detail-price">₹${product.price.toFixed(2)}</span>
            <span class="product-detail-original">₹${product.originalPrice.toFixed(2)}</span>
            <span class="product-detail-discount">${discount}% OFF</span>
          </div>
          
          <div class="product-detail-description">
            <h3>Description</h3>
            <p>${product.longDescription || product.description}</p>
          </div>

          <div class="nutrition-facts">
            <h3>Nutrition Facts (per serving)</h3>
            <div class="nutrition-item"><span>Calories</span> <span>${product.nutrition?.calories || 350} kcal</span></div>
            <div class="nutrition-item"><span>Protein</span> <span>${product.nutrition?.protein || '10g'}</span></div>
            <div class="nutrition-item"><span>Carbohydrates</span> <span>${product.nutrition?.carbs || '60g'}</span></div>
            <div class="nutrition-item"><span>Dietary Fiber</span> <span>${product.nutrition?.fiber || '7g'}</span></div>
            <div class="nutrition-item"><span>Fat</span> <span>${product.nutrition?.fat || '8g'}</span></div>
          </div>

          <div class="quantity-selector">
            <button class="quantity-btn" onclick="window.updateQuantity('decrement')">-</button>
            <input type="number" class="quantity-input" id="quantity" value="1" min="1" max="10">
            <button class="quantity-btn" onclick="window.updateQuantity('increment')">+</button>
          </div>

          <button class="add-to-cart-detail" onclick="window.addToCartFromDetail('${product.id}')">
            <i class="fas fa-shopping-cart"></i> Add to Cart
          </button>
        </div>
      </div>
      <div class="reviews-section">
        <h2>Customer Reviews (${product.reviews?.length || 0})</h2>
        ${reviews}
      </div>
    `;
};

window.updateQuantity = function (action) {
  const input = document.getElementById('quantity');
  let value = parseInt(input.value);
  if (action === 'increment' && value < 10) value++;
  if (action === 'decrement' && value > 1) value--;
  input.value = value;
};

window.changeMainImage = function (element, imgSrc) {
  document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
  element.classList.add('active');
  document.getElementById('mainProductImage').innerHTML = `<img src="${imgSrc}" alt="Product">`;
};

window.addToCartFromDetail = function (productId) {
  const product = allProducts.find(p => p.id === productId);
  const quantity = parseInt(document.getElementById('quantity').value);

  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: quantity,
      image: product.image
    });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartUI();
  cartSidebar.classList.add('open');
  overlay.classList.add('show');
};

function renderProducts() {
  if (displayedProducts.length === 0) {
    productGrid.innerHTML = '<p style="text-align: center; padding: 3rem; color: #70655c;">No products available yet.</p>';
    return;
  }

  productGrid.innerHTML = displayedProducts.map(p => {
    const discount = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
    return `
      <div class="product-card" onclick="window.showProductDetail('${p.id}')">
        <div class="product-img">
          <img src="${p.image || 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400'}" alt="${p.name}">
        </div>
        <h3>${p.name}</h3>
        <p class="product-desc">${p.description}</p>
        <div class="price-container">
          <span class="price">₹${p.price.toFixed(2)}</span>
          <span class="original-price">₹${p.originalPrice.toFixed(2)}</span>
          <span class="discount-badge">${discount}% OFF</span>
        </div>
      </div>
    `}).join('');
}

function updateCartUI() {
  localStorage.setItem('cart', JSON.stringify(cart));
  const totalItems = cart.reduce((acc, i) => acc + i.qty, 0);
  cartCountSpan.innerText = totalItems;

  if (cart.length === 0) {
    cartItems.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">Your cart is empty</p>';
    cartTotal.innerText = 'Total: ₹0';
  } else {
    let itemsHtml = '';
    let total = 0;

    cart.forEach((item, index) => {
      total += item.price * item.qty;
      itemsHtml += `
          <div class="cart-item">
            <div class="cart-item-img">
              <img src="${item.image || 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400'}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
              <div class="cart-item-title">${item.name}</div>
              <div class="cart-item-price">₹${item.price.toFixed(2)}</div>
              <div class="cart-item-quantity">
                <button class="cart-qty-btn" onclick="window.updateCartItemQty(${index}, -1)">-</button>
                <span>${item.qty}</span>
                <button class="cart-qty-btn" onclick="window.updateCartItemQty(${index}, 1)">+</button>
                <button class="cart-qty-btn" onclick="window.removeCartItem(${index})" style="margin-left: 0.5rem; color: #ff6b6b;">🗑️</button>
              </div>
            </div>
          </div>
        `;
    });

    cartItems.innerHTML = itemsHtml;
    cartTotal.innerText = `Total: ₹${total.toFixed(2)}`;
  }
}

window.updateCartItemQty = function (index, change) {
  if (cart[index].qty + change > 0 && cart[index].qty + change <= 10) {
    cart[index].qty += change;
    updateCartUI();
  }
};

window.removeCartItem = function (index) {
  cart.splice(index, 1);
  updateCartUI();
};

// ========== CART SIDEBAR EVENTS ==========
cartToggle.addEventListener('click', () => {
  cartSidebar.classList.add('open');
  overlay.classList.add('show');
});

closeCart.addEventListener('click', () => {
  cartSidebar.classList.remove('open');
  overlay.classList.remove('show');
});

overlay.addEventListener('click', () => {
  cartSidebar.classList.remove('open');
  overlay.classList.remove('show');
  window.closeEditModal();
  window.closeCheckoutModal();
});

homeLogo.addEventListener('click', window.showHome);

// ========== INITIAL LOAD ==========
loadProducts();
loadOrders();
updateCartUI();
