const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const boxen = require('boxen');

class DashboardManager {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  setupRoutes() {
    // API Routes
    this.app.get('/api/schema', this.getSchema.bind(this));
    this.app.post('/api/schema', this.updateSchema.bind(this));
    this.app.get('/api/tables', this.getTables.bind(this));
    this.app.post('/api/tables', this.createTable.bind(this));
    this.app.put('/api/tables/:tableName', this.updateTable.bind(this));
    this.app.delete('/api/tables/:tableName', this.deleteTable.bind(this));
    this.app.post('/api/migration/generate', this.generateMigration.bind(this));
    this.app.post('/api/migration/execute', this.executeMigration.bind(this));
    
    // Serve the dashboard
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }

  async start(port = 3000) {
    await this.ensureDashboardFiles();
    
    this.app.listen(port, () => {
      const message = `UniORM Dashboard is running at http://localhost:${port}`;
      console.log(
        boxen(message, {
          padding: 1,
          margin: 1,
          borderStyle: 'double',
          borderColor: 'cyan'
        })
      );
      console.log(chalk.yellow('Use the dashboard to visually design your database schema'));
      console.log(chalk.blue('Press Ctrl+C to stop the server'));
    });
  }

  async ensureDashboardFiles() {
    const publicDir = path.join(__dirname, 'public');
    await fs.ensureDir(publicDir);
    
    // Create dashboard HTML file
    const htmlContent = this.generateDashboardHTML();
    await fs.outputFile(path.join(publicDir, 'index.html'), htmlContent);
    
    // Create dashboard CSS file
    const cssContent = this.generateDashboardCSS();
    await fs.outputFile(path.join(publicDir, 'styles.css'), cssContent);
    
    // Create dashboard JS file
    const jsContent = this.generateDashboardJS();
    await fs.outputFile(path.join(publicDir, 'script.js'), jsContent);
  }

  generateDashboardHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UniORM Dashboard</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <div id="app">
        <header class="header">
            <div class="container">
                <h1><i class="fas fa-database"></i> UniORM Dashboard</h1>
                <div class="header-actions">
                    <button id="addTableBtn" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Add Table
                    </button>
                    <button id="generateMigrationBtn" class="btn btn-secondary">
                        <i class="fas fa-code"></i> Generate Migration
                    </button>
                </div>
            </div>
        </header>

        <main class="main">
            <div class="container">
                <div class="dashboard-grid">
                    <div class="sidebar">
                        <div class="sidebar-section">
                            <h3>Tables</h3>
                            <div id="tablesList" class="tables-list">
                                <!-- Tables will be populated here -->
                            </div>
                        </div>
                        
                        <div class="sidebar-section">
                            <h3>Migration Tools</h3>
                            <div class="migration-tools">
                                <button id="exportSchemaBtn" class="btn btn-outline">
                                    <i class="fas fa-download"></i> Export Schema
                                </button>
                                <button id="importSchemaBtn" class="btn btn-outline">
                                    <i class="fas fa-upload"></i> Import Schema
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="main-content">
                        <div id="schemaDesigner" class="schema-designer">
                            <div class="empty-state">
                                <i class="fas fa-table fa-3x"></i>
                                <h3>Design Your Database Schema</h3>
                                <p>Add tables to get started with your database design</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Add Table Modal -->
    <div id="addTableModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add New Table</h3>
                <button id="closeModal" class="btn-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="addTableForm">
                    <div class="form-group">
                        <label for="tableName">Table Name</label>
                        <input type="text" id="tableName" required>
                    </div>
                    <div class="form-group">
                        <label>Columns</label>
                        <div id="columnsContainer">
                            <div class="column-row">
                                <input type="text" placeholder="Column Name" class="column-name" required>
                                <select class="column-type">
                                    <option value="VARCHAR">VARCHAR</option>
                                    <option value="TEXT">TEXT</option>
                                    <option value="INTEGER">INTEGER</option>
                                    <option value="BIGINT">BIGINT</option>
                                    <option value="DECIMAL">DECIMAL</option>
                                    <option value="BOOLEAN">BOOLEAN</option>
                                    <option value="TIMESTAMP">TIMESTAMP</option>
                                    <option value="DATE">DATE</option>
                                </select>
                                <input type="number" placeholder="Length" class="column-length" min="1">
                                <label><input type="checkbox" class="column-nullable"> Nullable</label>
                                <label><input type="checkbox" class="column-primary"> Primary Key</label>
                                <button type="button" class="btn-remove-column">×</button>
                            </div>
                        </div>
                        <button type="button" id="addColumnBtn" class="btn btn-outline">Add Column</button>
                    </div>
                    <div class="form-actions">
                        <button type="button" id="cancelAddTable" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Table</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>`;
  }

  generateDashboardCSS() {
    return `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #f5f7fa;
    color: #2d3748;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1rem 0;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.header .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header h1 {
    font-size: 1.8rem;
    font-weight: 600;
}

.header-actions {
    display: flex;
    gap: 1rem;
}

.btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.btn-primary {
    background: #4299e1;
    color: white;
}

.btn-primary:hover {
    background: #3182ce;
}

.btn-secondary {
    background: #718096;
    color: white;
}

.btn-secondary:hover {
    background: #4a5568;
}

.btn-outline {
    background: transparent;
    border: 2px solid #e2e8f0;
    color: #4a5568;
}

.btn-outline:hover {
    background: #e2e8f0;
}

.main {
    padding: 2rem 0;
}

.dashboard-grid {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 2rem;
    min-height: 70vh;
}

.sidebar {
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.sidebar-section {
    margin-bottom: 2rem;
}

.sidebar-section h3 {
    font-size: 1.1rem;
    margin-bottom: 1rem;
    color: #2d3748;
    font-weight: 600;
}

.tables-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.table-item {
    padding: 0.75rem;
    background: #f7fafc;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.table-item:hover {
    background: #edf2f7;
    border-color: #cbd5e0;
}

.table-item.active {
    background: #e6fffa;
    border-color: #38b2ac;
}

.table-actions {
    display: flex;
    gap: 0.5rem;
}

.btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
}

.migration-tools {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.main-content {
    background: white;
    border-radius: 1rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    overflow: hidden;
}

.schema-designer {
    min-height: 500px;
    padding: 2rem;
}

.empty-state {
    text-align: center;
    padding: 3rem;
    color: #a0aec0;
}

.empty-state i {
    margin-bottom: 1rem;
}

.empty-state h3 {
    margin-bottom: 0.5rem;
}

.table-designer {
    background: #f7fafc;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 1rem;
    border: 1px solid #e2e8f0;
}

.table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.table-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: #2d3748;
}

.columns-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.column-header {
    font-weight: 600;
    color: #4a5568;
    padding: 0.5rem;
    background: #edf2f7;
    border-radius: 0.25rem;
}

.column-cell {
    padding: 0.5rem;
    background: white;
    border-radius: 0.25rem;
    border: 1px solid #e2e8f0;
}

.modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
}

.modal-content {
    background-color: white;
    margin: 5% auto;
    padding: 0;
    border-radius: 1rem;
    width: 90%;
    max-width: 600px;
    box-shadow: 0 20px 25px rgba(0,0,0,0.2);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
    font-size: 1.3rem;
    font-weight: 600;
}

.btn-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #a0aec0;
}

.btn-close:hover {
    color: #2d3748;
}

.modal-body {
    padding: 1.5rem;
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #2d3748;
}

.form-group input,
.form-group select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    font-size: 1rem;
    transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
}

.column-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr 1fr auto;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    align-items: center;
}

.column-row input,
.column-row select {
    margin-bottom: 0;
}

.btn-remove-column {
    background: #fed7d7;
    color: #c53030;
    border: none;
    border-radius: 0.25rem;
    width: 2rem;
    height: 2rem;
    cursor: pointer;
    font-size: 1rem;
    font-weight: bold;
}

.btn-remove-column:hover {
    background: #feb2b2;
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
}

@media (max-width: 768px) {
    .dashboard-grid {
        grid-template-columns: 1fr;
    }
    
    .sidebar {
        order: 2;
    }
    
    .main-content {
        order: 1;
    }
    
    .column-row {
        grid-template-columns: 1fr;
    }
    
    .columns-grid {
        grid-template-columns: 1fr;
    }
}`;
  }

  generateDashboardJS() {
    return `class DashboardApp {
    constructor() {
        this.tables = [];
        this.activeTable = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTables();
    }

    bindEvents() {
        // Add table button
        document.getElementById('addTableBtn').addEventListener('click', () => {
            this.showAddTableModal();
        });

        // Close modal
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideAddTableModal();
        });

        // Cancel add table
        document.getElementById('cancelAddTable').addEventListener('click', () => {
            this.hideAddTableModal();
        });

        // Add column button
        document.getElementById('addColumnBtn').addEventListener('click', () => {
            this.addColumnRow();
        });

        // Add table form submit
        document.getElementById('addTableForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTable();
        });

        // Generate migration button
        document.getElementById('generateMigrationBtn').addEventListener('click', () => {
            this.generateMigration();
        });

        // Export schema button
        document.getElementById('exportSchemaBtn').addEventListener('click', () => {
            this.exportSchema();
        });

        // Import schema button
        document.getElementById('importSchemaBtn').addEventListener('click', () => {
            this.importSchema();
        });

        // Close modal on outside click
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('addTableModal');
            if (e.target === modal) {
                this.hideAddTableModal();
            }
        });
    }

    async loadTables() {
        try {
            const response = await fetch('/api/tables');
            this.tables = await response.json();
            this.renderTables();
            this.renderSchemaDesigner();
        } catch (error) {
            console.error('Failed to load tables:', error);
        }
    }

    renderTables() {
        const tablesList = document.getElementById('tablesList');
        
        if (this.tables.length === 0) {
            tablesList.innerHTML = '<p class="empty-message">No tables yet</p>';
            return;
        }

        tablesList.innerHTML = this.tables.map(table => \`
            <div class="table-item \${this.activeTable === table.name ? 'active' : ''}" 
                 onclick="app.selectTable('\${table.name}')">
                <span><i class="fas fa-table"></i> \${table.name}</span>
                <div class="table-actions">
                    <button class="btn btn-sm btn-outline" onclick="app.editTable('\${table.name}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="app.deleteTable('\${table.name}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        \`).join('');
    }

    renderSchemaDesigner() {
        const schemaDesigner = document.getElementById('schemaDesigner');
        
        if (this.tables.length === 0) {
            schemaDesigner.innerHTML = \`
                <div class="empty-state">
                    <i class="fas fa-table fa-3x"></i>
                    <h3>Design Your Database Schema</h3>
                    <p>Add tables to get started with your database design</p>
                </div>
            \`;
            return;
        }

        schemaDesigner.innerHTML = this.tables.map(table => \`
            <div class="table-designer">
                <div class="table-header">
                    <h3 class="table-title"><i class="fas fa-table"></i> \${table.name}</h3>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-outline" onclick="app.editTable('\${table.name}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="app.deleteTable('\${table.name}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
                <div class="columns-grid">
                    <div class="column-header">Column Name</div>
                    <div class="column-header">Type</div>
                    <div class="column-header">Length</div>
                    <div class="column-header">Nullable</div>
                    <div class="column-header">Primary Key</div>
                    <div class="column-header">Default</div>
                    \${table.columns.map(col => \`
                        <div class="column-cell">\${col.name}</div>
                        <div class="column-cell">\${col.type}</div>
                        <div class="column-cell">\${col.length || '-'}</div>
                        <div class="column-cell">\${col.nullable ? 'Yes' : 'No'}</div>
                        <div class="column-cell">\${col.primary ? 'Yes' : 'No'}</div>
                        <div class="column-cell">\${col.default || '-'}</div>
                    \`).join('')}
                </div>
            </div>
        \`).join('');
    }

    showAddTableModal() {
        document.getElementById('addTableModal').style.display = 'block';
        document.getElementById('tableName').focus();
    }

    hideAddTableModal() {
        document.getElementById('addTableModal').style.display = 'none';
        document.getElementById('addTableForm').reset();
        // Reset columns to default
        const container = document.getElementById('columnsContainer');
        container.innerHTML = \`
            <div class="column-row">
                <input type="text" placeholder="Column Name" class="column-name" required>
                <select class="column-type">
                    <option value="VARCHAR">VARCHAR</option>
                    <option value="TEXT">TEXT</option>
                    <option value="INTEGER">INTEGER</option>
                    <option value="BIGINT">BIGINT</option>
                    <option value="DECIMAL">DECIMAL</option>
                    <option value="BOOLEAN">BOOLEAN</option>
                    <option value="TIMESTAMP">TIMESTAMP</option>
                    <option value="DATE">DATE</option>
                </select>
                <input type="number" placeholder="Length" class="column-length" min="1">
                <label><input type="checkbox" class="column-nullable"> Nullable</label>
                <label><input type="checkbox" class="column-primary"> Primary Key</label>
                <button type="button" class="btn-remove-column" onclick="this.parentElement.remove()">×</button>
            </div>
        \`;
    }

    addColumnRow() {
        const container = document.getElementById('columnsContainer');
        const newRow = document.createElement('div');
        newRow.className = 'column-row';
        newRow.innerHTML = \`
            <input type="text" placeholder="Column Name" class="column-name" required>
            <select class="column-type">
                <option value="VARCHAR">VARCHAR</option>
                <option value="TEXT">TEXT</option>
                <option value="INTEGER">INTEGER</option>
                <option value="BIGINT">BIGINT</option>
                <option value="DECIMAL">DECIMAL</option>
                <option value="BOOLEAN">BOOLEAN</option>
                <option value="TIMESTAMP">TIMESTAMP</option>
                <option value="DATE">DATE</option>
            </select>
            <input type="number" placeholder="Length" class="column-length" min="1">
            <label><input type="checkbox" class="column-nullable"> Nullable</label>
            <label><input type="checkbox" class="column-primary"> Primary Key</label>
            <button type="button" class="btn-remove-column" onclick="this.parentElement.remove()">×</button>
        \`;
        container.appendChild(newRow);
    }

    async createTable() {
        const tableName = document.getElementById('tableName').value;
        const columnRows = document.querySelectorAll('.column-row');
        
        const columns = Array.from(columnRows).map(row => {
            const name = row.querySelector('.column-name').value;
            const type = row.querySelector('.column-type').value;
            const length = row.querySelector('.column-length').value;
            const nullable = row.querySelector('.column-nullable').checked;
            const primary = row.querySelector('.column-primary').checked;
            
            return {
                name,
                type,
                length: length ? parseInt(length) : null,
                nullable,
                primary
            };
        }).filter(col => col.name.trim() !== '');

        if (columns.length === 0) {
            alert('Please add at least one column');
            return;
        }

        try {
            const response = await fetch('/api/tables', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: tableName,
                    columns
                })
            });

            if (response.ok) {
                await this.loadTables();
                this.hideAddTableModal();
                this.showNotification('Table created successfully!', 'success');
            } else {
                throw new Error('Failed to create table');
            }
        } catch (error) {
            console.error('Error creating table:', error);
            this.showNotification('Failed to create table', 'error');
        }
    }

    async deleteTable(tableName) {
        if (!confirm(\`Are you sure you want to delete the table "\${tableName}"?\`)) {
            return;
        }

        try {
            const response = await fetch(\`/api/tables/\${tableName}\`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadTables();
                this.showNotification('Table deleted successfully!', 'success');
            } else {
                throw new Error('Failed to delete table');
            }
        } catch (error) {
            console.error('Error deleting table:', error);
            this.showNotification('Failed to delete table', 'error');
        }
    }

    selectTable(tableName) {
        this.activeTable = tableName;
        this.renderTables();
    }

    editTable(tableName) {
        // Implementation for editing table
        console.log('Edit table:', tableName);
    }

    async generateMigration() {
        try {
            const response = await fetch('/api/migration/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tables: this.tables
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.showMigrationCode(result.code);
            } else {
                throw new Error('Failed to generate migration');
            }
        } catch (error) {
            console.error('Error generating migration:', error);
            this.showNotification('Failed to generate migration', 'error');
        }
    }

    showMigrationCode(code) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = \`
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Generated Migration Code</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <pre><code>\${code}</code></pre>
                    <div class="form-actions">
                        <button class="btn btn-primary" onclick="app.executeMigration('\${code}')">
                            Execute Migration
                        </button>
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        \`;
        document.body.appendChild(modal);
    }

    async executeMigration(code) {
        try {
            const response = await fetch('/api/migration/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });

            if (response.ok) {
                this.showNotification('Migration executed successfully!', 'success');
            } else {
                throw new Error('Failed to execute migration');
            }
        } catch (error) {
            console.error('Error executing migration:', error);
            this.showNotification('Failed to execute migration', 'error');
        }
    }

    async exportSchema() {
        try {
            const response = await fetch('/api/schema');
            const schema = await response.json();
            
            const blob = new Blob([JSON.stringify(schema, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'schema.json';
            a.click();
            
            URL.revokeObjectURL(url);
            this.showNotification('Schema exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting schema:', error);
            this.showNotification('Failed to export schema', 'error');
        }
    }

    importSchema() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const schema = JSON.parse(text);
                    
                    const response = await fetch('/api/schema', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(schema)
                    });

                    if (response.ok) {
                        await this.loadTables();
                        this.showNotification('Schema imported successfully!', 'success');
                    } else {
                        throw new Error('Failed to import schema');
                    }
                } catch (error) {
                    console.error('Error importing schema:', error);
                    this.showNotification('Failed to import schema', 'error');
                }
            }
        };
        input.click();
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = \`notification notification-\${type}\`;
        notification.textContent = message;
        notification.style.cssText = \`
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            color: white;
            font-weight: 500;
            z-index: 1001;
            animation: slideIn 0.3s ease-out;
            background: \${type === 'success' ? '#48bb78' : '#f56565'};
        \`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize the app
const app = new DashboardApp();`;
  }

  // API Route Handlers
  async getSchema(req, res) {
    try {
      const schemaPath = path.join(process.cwd(), 'uni-orm.schema.yaml');
      if (await fs.pathExists(schemaPath)) {
        const schema = await fs.readFile(schemaPath, 'utf8');
        res.json(JSON.parse(schema));
      } else {
        res.json({ tables: [] });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateSchema(req, res) {
    try {
      const schema = req.body;
      const schemaPath = path.join(process.cwd(), 'uni-orm.schema.yaml');
      await fs.outputFile(schemaPath, JSON.stringify(schema, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTables(req, res) {
    try {
      const schemaPath = path.join(process.cwd(), 'uni-orm.schema.yaml');
      if (await fs.pathExists(schemaPath)) {
        const content = await fs.readFile(schemaPath, 'utf8');
        const schema = JSON.parse(content);
        res.json(schema.tables || []);
      } else {
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createTable(req, res) {
    try {
      const { name, columns } = req.body;
      const schemaPath = path.join(process.cwd(), 'uni-orm.schema.yaml');
      
      let schema = { tables: [] };
      if (await fs.pathExists(schemaPath)) {
        const content = await fs.readFile(schemaPath, 'utf8');
        schema = JSON.parse(content);
      }
      
      schema.tables.push({ name, columns });
      await fs.outputFile(schemaPath, JSON.stringify(schema, null, 2));
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateTable(req, res) {
    try {
      const { tableName } = req.params;
      const { name, columns } = req.body;
      const schemaPath = path.join(process.cwd(), 'uni-orm.schema.yaml');
      
      if (await fs.pathExists(schemaPath)) {
        const content = await fs.readFile(schemaPath, 'utf8');
        const schema = JSON.parse(content);
        
        const tableIndex = schema.tables.findIndex(t => t.name === tableName);
        if (tableIndex !== -1) {
          schema.tables[tableIndex] = { name, columns };
          await fs.outputFile(schemaPath, JSON.stringify(schema, null, 2));
          res.json({ success: true });
        } else {
          res.status(404).json({ error: 'Table not found' });
        }
      } else {
        res.status(404).json({ error: 'Schema not found' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteTable(req, res) {
    try {
      const { tableName } = req.params;
      const schemaPath = path.join(process.cwd(), 'uni-orm.schema.yaml');
      
      if (await fs.pathExists(schemaPath)) {
        const content = await fs.readFile(schemaPath, 'utf8');
        const schema = JSON.parse(content);
        
        schema.tables = schema.tables.filter(t => t.name !== tableName);
        await fs.outputFile(schemaPath, JSON.stringify(schema, null, 2));
        
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Schema not found' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async generateMigration(req, res) {
    try {
      const { tables } = req.body;
      
      let code = `-- Generated Migration\n-- Created: ${new Date().toISOString()}\n\n`;
      
      for (const table of tables) {
        code += `CREATE TABLE IF NOT EXISTS ${table.name} (\n`;
        
        const columnDefs = table.columns.map(col => {
          let def = `  ${col.name} ${col.type}`;
          if (col.length) def += `(${col.length})`;
          if (col.primary) def += ' PRIMARY KEY';
          if (!col.nullable) def += ' NOT NULL';
          return def;
        });
        
        code += columnDefs.join(',\n');
        code += '\n);\n\n';
      }
      
      res.json({ code });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async executeMigration(req, res) {
    try {
      const { code } = req.body;
      
      // Save migration to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${timestamp}-dashboard-migration.sql`;
      const migrationPath = path.join(process.cwd(), 'migrations', filename);
      
      await fs.ensureDir(path.dirname(migrationPath));
      await fs.outputFile(migrationPath, code);
      
      console.log(chalk.green(`Migration saved: ${filename}`));
      
      res.json({ success: true, filename });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = { DashboardManager };