import { useState } from "react";
import "./App.css";

const API = "http://localhost:3001";

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState("home");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");

  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  async function login(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setRole(data.role);
        setPassword("");
        setMessage("Login successful!");
      } else {
        setMessage(data.message || "Login failed");
      }
    } catch {
      setMessage("Cannot connect to backend");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const data = await apiRequest("/api/change-password", {
        method: "PUT",
        body: JSON.stringify({ oldPassword, newPassword })
      });

      setMessage(data.message);
      setOldPassword("");
      setNewPassword("");
      setPage("home");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const data = await apiRequest("/api/users");
      setUsers(data);
      setSelectedUser("");
      setNewPassword("");
      setPage("users");
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function changeUserPassword(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const data = await apiRequest(
        `/api/users/${selectedUser}/password`,
        {
          method: "PUT",
          body: JSON.stringify({ newPassword })
        }
      );

      setMessage(data.message);
      setNewPassword("");
      setSelectedUser("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadItems() {
    try {
      const data = await apiRequest("/api/item");
      setItems(data);
      setPage("items");
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function addItem(e) {
    e.preventDefault();

    try {
      await apiRequest("/api/item", {
        method: "POST",
        body: JSON.stringify({ name: itemName })
      });

      setItemName("");
      await loadItems();
      setMessage("Item added successfully");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function editItem(item) {
    const name = window.prompt(
      "Enter new item name:",
      item.name
    );

    if (name === null) return;

    try {
      await apiRequest(`/api/item/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ name })
      });

      await loadItems();
      setMessage("Item updated successfully");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Delete ${item.name}?`)) return;

    try {
      await apiRequest(`/api/item/${item.id}`, {
        method: "DELETE"
      });

      await loadItems();
      setMessage("Item deleted successfully");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadAuditLogs() {
    try {
      const data = await apiRequest("/api/audit-log");
      setAuditLogs(data);
      setPage("audit");
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function logout() {
    setToken("");
    setRole("");
    setUsername("");
    setPassword("");
    setOldPassword("");
    setNewPassword("");
    setUsers([]);
    setSelectedUser("");
    setItems([]);
    setItemName("");
    setAuditLogs([]);
    setPage("home");
    setMessage("Logged out successfully");
  }

  return (
    <div className="page">
      <div className="login-card">
        <h1>User Management System</h1>

        {!token ? (
          <form onSubmit={login}>
            <h2>Login</h2>

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        ) : page === "change-password" ? (
          <form onSubmit={changePassword}>
            <h2>Change Password</h2>

            <input
              type="password"
              placeholder="Current Password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="New Password (8+ characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Change Password"}
            </button>

            <button
              type="button"
              onClick={() => setPage("home")}
            >
              Back
            </button>
          </form>
        ) : page === "users" && role === "admin" ? (
          <div className="welcome">
            <h2>User Management</h2>

            <h3>Users</h3>

            {users.map((user) => (
              <p key={user.id}>
                {user.username} ({user.role})
              </p>
            ))}

            <form onSubmit={changeUserPassword}>
              <h3>Change User Password</h3>

              <select
                value={selectedUser}
                onChange={(e) =>
                  setSelectedUser(e.target.value)
                }
                required
              >
                <option value="">Select User</option>

                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
              </select>

              <input
                type="password"
                placeholder="New Password (8+ characters)"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
                minLength={8}
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Update Password"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setPage("home")}
            >
              Back
            </button>
          </div>
        ) : page === "items" ? (
          <div className="welcome">
            <h2>Item Management</h2>

            <form onSubmit={addItem}>
              <input
                type="text"
                placeholder="Item name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />

              <button type="submit">Add Item</button>
            </form>

            <h3>Items</h3>

            {items.length === 0 && <p>No items found</p>}

            {items.map((item) => (
              <div key={item.id}>
                <p>{item.name}</p>

                <button
                  type="button"
                  onClick={() => editItem(item)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => deleteItem(item)}
                >
                  Delete
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setPage("home")}
            >
              Back
            </button>
          </div>
        ) : page === "audit" && role === "admin" ? (
          <div className="welcome">
            <h2>Audit Log</h2>

            {auditLogs.length === 0 && (
              <p>No audit logs found</p>
            )}

            {auditLogs.map((log) => (
              <p key={log.id}>
                {log.action} — {log.itemName}
                <br />
                User ID: {log.performedBy}
                <br />
                {log.timestamp}
              </p>
            ))}

            <button
              type="button"
              onClick={() => setPage("home")}
            >
              Back
            </button>
          </div>
        ) : (
          <div className="welcome">
            <h2>Welcome, {username}!</h2>
            <p>Role: {role}</p>

            <button
              type="button"
              onClick={() => {
                setPage("change-password");
                setMessage("");
              }}
            >
              Change Password
            </button>

            <button type="button" onClick={loadItems}>
              Item Management
            </button>

            {role === "admin" && (
              <>
                <button
                  type="button"
                  onClick={loadUsers}
                >
                  User Management
                </button>

                <button
                  type="button"
                  onClick={loadAuditLogs}
                >
                  Audit Log
                </button>
              </>
            )}

            <button
              type="button"
              className="logout-btn"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        )}

        {message && (
          <p className="message">{message}</p>
        )}
      </div>
    </div>
  );
}

export default App;