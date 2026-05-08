const modal = document.getElementById('editUserModal');
const modalUserId = document.getElementById('editUserId');
const modalUsername = document.getElementById('editUsername');
const closeModalButton = document.getElementById('closeEditModal');
const editButtons = document.querySelectorAll('.edit-user-button');
const createUserButton = document.querySelector('[data-open-create-user]');
const createModal = document.getElementById('createUserModal');
const createUsername = document.getElementById('createUsername');
const closeCreateModalButton = document.getElementById('closeCreateModal');
const createUserForm = document.getElementById('createUserForm');
const deleteButtons = document.querySelectorAll('.delete-user-button');
const deleteModal = document.getElementById('deleteUserModal');
const deleteUserId = document.getElementById('deleteUserId');
const deleteUserMessage = document.getElementById('deleteUserMessage');
const closeDeleteModalButton = document.getElementById('closeDeleteModal');
const deleteUserForm = document.getElementById('deleteUserForm');

const openModal = (userId, username) => {
    modalUserId.value = userId;
    modalUsername.value = username;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    modalUsername.focus();
};

const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
};

const openCreateModal = () => {
    createUserForm.reset();
    createModal.classList.add('is-open');
    createModal.setAttribute('aria-hidden', 'false');
    createUsername.focus();
};

const closeCreateModal = () => {
    createModal.classList.remove('is-open');
    createModal.setAttribute('aria-hidden', 'true');
};

const openDeleteModal = (userId, username) => {
    deleteUserId.value = userId;
    deleteUserMessage.textContent = `Are you sure you want to delete ${username}?`;
    deleteModal.classList.add('is-open');
    deleteModal.setAttribute('aria-hidden', 'false');
};

const closeDeleteModal = () => {
    deleteModal.classList.remove('is-open');
    deleteModal.setAttribute('aria-hidden', 'true');
};

editButtons.forEach((button) => {
    button.addEventListener('click', () => {
        openModal(button.dataset.userId || '', button.dataset.username || '');
    });
});

if (createUserButton) {
    createUserButton.addEventListener('click', openCreateModal);
}

deleteButtons.forEach((button) => {
    button.addEventListener('click', () => {
        openDeleteModal(button.dataset.userId || '', button.dataset.username || '');
    });
});

closeModalButton.addEventListener('click', closeModal);
closeCreateModalButton.addEventListener('click', closeCreateModal);
closeDeleteModalButton.addEventListener('click', closeDeleteModal);

createModal.addEventListener('click', (event) => {
    if (event.target === createModal) {
        closeCreateModal();
    }
});

deleteModal.addEventListener('click', (event) => {
    if (event.target === deleteModal) {
        closeDeleteModal();
    }
});

modal.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
    }

    if (event.key === 'Escape' && createModal.classList.contains('is-open')) {
        closeCreateModal();
    }

    if (event.key === 'Escape' && deleteModal.classList.contains('is-open')) {
        closeDeleteModal();
    }
});

createUserForm.addEventListener('submit', () => {
    closeCreateModal();
});

deleteUserForm.addEventListener('submit', () => {
    closeDeleteModal();
});