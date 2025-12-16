// OLD DASHBOARD V1 - DO NOT TOUCH
// Created by Bob in 2015

$(document).ready(function () {
    // Init Grid
    $('#user-grid').html('Loading...');

    $.ajax({
        url: '/api/v1/getUsers',
        method: 'POST',
        data: { token: window.localStorage.getItem('auth_token') },
        success: function (response) {
            var html = '<table class="table-striped">';
            html += '<thead><tr><th>Name</th><th>Role</th><th>Actions</th></tr></thead>';
            html += '<tbody>';

            response.users.forEach(function (u) {
                // Logic mixed with UI
                var roleColor = u.role === 'ADMIN' ? 'red' : 'gray';

                html += '<tr>';
                html += '<td>' + u.name + '</td>';
                html += '<td style="color:' + roleColor + '">' + u.role + '</td>';
                html += '<td><button class="btn-delete" onclick="deleteUser(' + u.id + ')">Delete</button></td>';
                html += '</tr>';
            });

            html += '</tbody></table>';
            $('#user-grid').html(html);
        },
        error: function (err) {
            $('#error-banner').text('Failed to load users');
            $('#error-banner').show();
        }
    });

    // Global listener - Memory leak potential
    $('.btn-delete').click(function () {
        alert("Are you sure?");
    });
});

function deleteUser(id) {
    if (confirm('Really delete ' + id + '?')) {
        $.post('/api/delete', { id: id }, function () {
            location.reload(); // Hard reload is bad
        });
    }
}
