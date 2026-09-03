import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { unwrap, apiError } from '../lib/api';
import { Card, Table, Button, Input, Select, Badge, date } from '../components/ui';

export default function Users() {
  const qc = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => unwrap(await api.get('/users')),
  });

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      try {
        const res = unwrap(await api.get('/users/roles'));
        return Array.isArray(res) ? res : [];
      } catch (e) {
        return [];
      }
    },
  });

  const [show, setShow] = React.useState(false);
  const [edit, setEdit] = React.useState(null);
  const [f, setF] = React.useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
    status: 'ACTIVE',
  });

  const save = useMutation({
    mutationFn: (data) =>
      edit ? api.patch(`/users/${edit.id}`, data) : api.post('/users', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setShow(false);
      setEdit(null);
    },
  });

  const submit = (e) => {
    e.preventDefault();
    const payload = { ...f };
    if (edit && !payload.password) delete payload.password;
    save.mutate(payload);
  };

  const roles = rolesQuery.data || [];

  return (
    <div>
      <div className="pageIntro">
        <div>
          <span className="eyebrow">Administration</span>
          <h2>Users</h2>
          <p className="muted">Store users and role assignments.</p>
        </div>
        <Button
          onClick={() => {
            setEdit(null);
            setF({
              name: '',
              email: '',
              phone: '',
              password: '',
              roleId: roles[0]?.id || '',
              status: 'ACTIVE',
            });
            setShow(!show);
          }}
        >
          + New user
        </Button>
      </div>

      {show && (
        <Card title={edit ? 'Edit user' : 'Create user'}>
          <form className="formGrid" onSubmit={submit}>
            <Input
              label="Name"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
            <Input
              label="Phone"
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
            <Input
              label="Password"
              type="password"
              placeholder={edit ? 'Leave blank to keep unchanged' : 'Enter password'}
              value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })}
              required={!edit}
            />
            
            {/* Friendly Role Dropdown Selector instead of raw Role ID */}
            <Select
              label="Role"
              value={f.roleId}
              onChange={(e) => setF({ ...f, roleId: e.target.value })}
              required
            >
              <option value="" disabled>Select User Role</option>
              {roles.length > 0 ? (
                roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.description ? `(${r.description})` : ''}
                  </option>
                ))
              ) : (
                <>
                  <option value={f.roleId || 'ADMIN'}>Admin</option>
                  <option value="STAFF">Staff</option>
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="CASHIER">Cashier</option>
                </>
              )}
            </Select>

            <Select
              label="Status"
              value={f.status}
              onChange={(e) => setF({ ...f, status: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </Select>

            <div className="formActions">
              <Button disabled={save.isPending}>
                {save.isPending ? 'Saving…' : edit ? 'Save changes' : 'Create user'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShow(false)}>
                Cancel
              </Button>
            </div>
          </form>
          {save.isError && <div className="alert errorBox">{apiError(save.error)}</div>}
        </Card>
      )}

      <Card title="Users">
        <Table
          columns={[
            { key: 'name', label: 'NAME' },
            { key: 'email', label: 'EMAIL' },
            { key: 'phone', label: 'PHONE' },
            {
              key: 'role',
              label: 'ROLE',
              render: (r) => (
                <span
                  style={{
                    fontWeight: 700,
                    color: '#007a70',
                    background: '#eef8f5',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                  }}
                >
                  {r.role?.name || r.roleId || 'USER'}
                </span>
              ),
            },
            {
              key: 'status',
              label: 'STATUS',
              render: (r) => (
                <Badge tone={r.status === 'ACTIVE' ? 'success' : 'warning'}>
                  {r.status}
                </Badge>
              ),
            },
            { key: 'createdAt', label: 'CREATED', render: (r) => date(r.createdAt) },
          ]}
          rows={usersQuery.data || []}
          onRow={(u) => {
            setEdit(u);
            setF({
              name: u.name || '',
              email: u.email || '',
              phone: u.phone || '',
              password: '',
              roleId: u.roleId || u.role?.id || '',
              status: u.status || 'ACTIVE',
            });
            setShow(true);
          }}
        />
      </Card>
    </div>
  );
}
