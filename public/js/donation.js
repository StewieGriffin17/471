// Only modal logic and UX effects, all CRUD moved to backend

function openModal(id) {
    const modal = document.getElementById('assignModal');
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('assignModal');
    modal.classList.remove('active');
}

window.onclick = function(event) {
    const modal = document.getElementById('assignModal');
    if (event.target === modal) closeModal();
}