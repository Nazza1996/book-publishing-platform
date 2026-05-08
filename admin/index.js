fetch('/components/navbar.html')
    .then(res => res.text())
    .then(data => {
        document.getElementById('navbar').innerHTML = data;
    });

fetch('/admin/adminNav.html')
    .then(res => res.text())
    .then(data => {
        document.getElementById('adminNav').innerHTML = data;
    });

fetch('/components/footer.html')
    .then(res => res.text())
    .then(data => {
        document.getElementById('footer').innerHTML = data;
        const currentYear = new Date().getFullYear();
        document.getElementById('currentYear').textContent = currentYear;
    });