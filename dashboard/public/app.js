const tablesEl = document.getElementById('tables');
const collectionsEl = document.getElementById('collections');
const outputEl = document.getElementById('output');

// Sample schema data. In real usage this would come from the server.
const schema = [
  { name: 'users', columns: ['id', 'name', 'email'] },
  { name: 'posts', columns: ['id', 'title', 'body', 'user_id'] }
];

const mapping = {};

function renderTables() {
  schema.forEach(table => {
    const wrapper = document.createElement('div');
    const tableDiv = document.createElement('div');
    tableDiv.textContent = table.name;
    tableDiv.className = 'draggable';
    tableDiv.draggable = true;
    tableDiv.addEventListener('dragstart', e => {
      e.dataTransfer.setData('type', 'table');
      e.dataTransfer.setData('table', table.name);
    });
    wrapper.appendChild(tableDiv);

    table.columns.forEach(col => {
      const colDiv = document.createElement('div');
      colDiv.textContent = `- ${col}`;
      colDiv.className = 'draggable';
      colDiv.style.marginLeft = '10px';
      colDiv.draggable = true;
      colDiv.addEventListener('dragstart', e => {
        e.dataTransfer.setData('type', 'column');
        e.dataTransfer.setData('table', table.name);
        e.dataTransfer.setData('column', col);
      });
      wrapper.appendChild(colDiv);
    });

    tablesEl.appendChild(wrapper);
  });
}

collectionsEl.addEventListener('dragover', e => {
  e.preventDefault();
});

collectionsEl.addEventListener('drop', e => {
  e.preventDefault();
  const type = e.dataTransfer.getData('type');
  if (type === 'table') {
    const tableName = e.dataTransfer.getData('table');
    if (mapping[tableName]) return; // already mapped
    const collectionName = prompt('Collection name for ' + tableName, tableName);
    if (!collectionName) return;
    const colEl = document.createElement('div');
    colEl.className = 'collection';
    colEl.dataset.table = tableName;
    colEl.innerHTML = `<h4>${collectionName}</h4><div class="fields dropzone"></div>`;
    collectionsEl.appendChild(colEl);
    mapping[tableName] = { collection: collectionName, fields: {} };

    const fieldsDrop = colEl.querySelector('.fields');
    fieldsDrop.addEventListener('dragover', evt => evt.preventDefault());
    fieldsDrop.addEventListener('drop', evt => {
      evt.preventDefault();
      const t = evt.dataTransfer.getData('type');
      if (t !== 'column') return;
      const srcTable = evt.dataTransfer.getData('table');
      if (srcTable !== tableName) return; // ensure from same table
      const columnName = evt.dataTransfer.getData('column');
      const fieldName = prompt('Field name for ' + columnName, columnName);
      if (!fieldName) return;
      mapping[tableName].fields[columnName] = fieldName;
      const fieldDiv = document.createElement('div');
      fieldDiv.textContent = columnName + ' → ' + fieldName;
      fieldsDrop.appendChild(fieldDiv);
    });
  }
});

renderTables();

function collectOptions() {
  return {
    relationStrategy: document.getElementById('relationStrategy').value,
    idStrategy: document.getElementById('idStrategy').value,
    decimalMode: document.getElementById('decimalMode').value
  };
}

document.getElementById('previewBtn').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/mapping/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapping, options: collectOptions() })
    });
    const data = await res.json();
    outputEl.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    outputEl.textContent = 'Error: ' + err.message;
  }
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/changesets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapping, options: collectOptions() })
    });
    const data = await res.json();
    if (data.token) {
      outputEl.textContent = `Token: ${data.token}\nCommand: uniorm pull dbchange ${data.token}`;
    } else {
      outputEl.textContent = JSON.stringify(data, null, 2);
    }
  } catch (err) {
    outputEl.textContent = 'Error: ' + err.message;
  }
});
