const borrowingData = JSON.parse(localStorage.getItem('borrowingData')) || {};
window.onload = function () {
    fetch('/api/books')
        .then(response => response.json())
        .then(books => {
            const bookTable = document.getElementById('book-table');
            const borrowBookSelect = document.getElementById('borrowBookId');
            const returnBookSelect = document.getElementById('returnBookId');

            borrowBookSelect.innerHTML = '<option value="">Select a Book</option>';
            returnBookSelect.innerHTML = '<option value="">Select a Book</option>';

            books.forEach(book => {
                const id = book.BID;
                const title = book.title;
                const authorName = book.author || 'Unknown';
                const publisherName = book.publisher || 'Unknown';
                const genreName = book.genre || 'Unknown';

                const row = document.createElement('tr');
                row.setAttribute('data-id', id);

                const isBorrowed = book.borrower_name && book.borrower_date && book.return_date;

                row.innerHTML = `<td>${id}</td>
                                <td><a href="/viewer.html?file=book&id=${id}">${title}</a></td>
                                <td><a href="/viewer.html?file=author&id=${book.authID}">${authorName}</td>
                                <td><a href="/viewer.html?file=publisher&id=${book.pubID}">${publisherName}</td>
                                <td><a href="/viewer.html?file=genre&id=${book.genreID}">${genreName}</td>
                                <td>${isBorrowed ? book.borrower_name : ''}</td>
                                <td>${isBorrowed ? book.borrower_date : ''}</td>
                                <td>${isBorrowed ? book.return_date : ''}</td>
                                <td>${isBorrowed ? 'Borrowed' : 'Present'}</td>`;

                bookTable.appendChild(row);

                if (!isBorrowed) {
                    const option = document.createElement('option');
                    option.value = id;
                    option.textContent = `${id} - ${title}`;
                    borrowBookSelect.appendChild(option);
                } else {
                    const returnOption = document.createElement('option');
                    returnOption.value = id;
                    returnOption.textContent = `${id} - ${title}`;
                    returnBookSelect.appendChild(returnOption);
                }
            });
        })
        .catch(error => {
            console.error('Error fetching books:', error);
        });
};

// Handle Borrow Form Submission
document.getElementById('borrowForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const bookId = document.getElementById('borrowBookId').value;
    const borrowerName = document.getElementById('borrowerName').value.trim();
    const borrowDate = document.getElementById('borrowDate').value;

    if (!bookId || !borrowerName || !borrowDate) {
        alert('Please fill in all fields.');
        return;
    }

    if (!confirm(`Are you sure you want to borrow Book ID ${bookId}?`)) {
        return;
    }

    const row = document.querySelector(`#book-table tr[data-id="${bookId}"]`);
    if (row) {
        const currentState = row.cells[8].textContent;
        if (currentState === 'Borrowed') {
            alert('This book is already borrowed.');
            return;
        }

        const returnDate = new Date(borrowDate);
        returnDate.setMonth(returnDate.getMonth() + 3);

        // Optimistically update UI first
        row.cells[5].textContent = borrowerName;
        row.cells[6].textContent = borrowDate;
        row.cells[7].textContent = returnDate.toISOString().split('T')[0];
        row.cells[8].textContent = 'Borrowed';
        row.classList.add('borrowed');


        // Send borrow info to backend
        fetch(`/api/books/${bookId}/borrow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                borrower_name: borrowerName,
                borrower_date: borrowDate,
                return_date: returnDate.toISOString().split('T')[0]
            })
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to update borrow status on server');
            return response.json();
        })
        .then(data => {
            console.log('Borrow status updated:', data);
        })
        .catch(error => {
            alert('Error updating borrow status: ' + error.message);
        });

        // Update select options
        const borrowBookSelect = document.getElementById('borrowBookId');
        const optionToRemove = borrowBookSelect.querySelector(`option[value="${bookId}"]`);
        if (optionToRemove) {
            optionToRemove.remove();
        }

        const returnBookSelect = document.getElementById('returnBookId');
        const newReturnOption = document.createElement('option');
        newReturnOption.value = bookId;
        newReturnOption.textContent = `${bookId} - ${row.cells[1].textContent}`;
        returnBookSelect.appendChild(newReturnOption);

        document.getElementById('borrowForm').reset();

        alert(`Book ID ${bookId} has been successfully borrowed.`);
    } else {
        alert('No book found with that ID.');
    }
});

// Handle Return Form Submission
document.getElementById('returnForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const bookId = document.getElementById('returnBookId').value;
    const returnDateInput = document.getElementById('returnDate').value;

    if (!bookId || !returnDateInput) {
        alert('Please fill in all fields.');
        return;
    }

    if (!confirm(`Are you sure you want to return Book ID ${bookId}?`)) {
        return;
    }

    const row = document.querySelector(`#book-table tr[data-id="${bookId}"]`);
    if (row) {
        const currentState = row.cells[8].textContent;
        if (currentState !== 'Borrowed') {
            alert('This book is not currently borrowed.');
            return;
        }

        // Optimistically update UI first
        row.cells[5].textContent = '';
        row.cells[6].textContent = '';
        row.cells[7].textContent = '';
        row.cells[8].textContent = 'Present';
        row.classList.remove('borrowed');

        // Send return info to backend
        fetch(`/api/books/${bookId}/return`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            })
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to update return status on server');
            return response.json();
        })
        .then(data => {
            console.log('Return status updated:', data);
        })
        .catch(error => {
            alert('Error updating return status: ' + error.message);
        });

        // Update select options
        const returnBookSelect = document.getElementById('returnBookId');
        const optionToRemove = returnBookSelect.querySelector(`option[value="${bookId}"]`);
        if (optionToRemove) {
            optionToRemove.remove();
        }

        const borrowBookSelect = document.getElementById('borrowBookId');
        const newBorrowOption = document.createElement('option');
        newBorrowOption.value = bookId;
        newBorrowOption.textContent = `${bookId} - ${row.cells[1].textContent}`;
        borrowBookSelect.appendChild(newBorrowOption);

        document.getElementById('returnForm').reset();

        alert(`Book ID ${bookId} has been successfully returned.`);
    } else {
        alert('No book found with that ID.');
    }
});

// Clear borrowing data
document.getElementById('clearDataBtn').addEventListener('click', function () {
 if (!confirm('Are you sure you want to clear all borrow records?')) return;

    fetch('/api/borrowers/clear', {
        method: 'DELETE'
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to clear borrow records');
        return res.json();
    })
    .then(() => location.reload())
    .catch(err => alert(err.message));
});
