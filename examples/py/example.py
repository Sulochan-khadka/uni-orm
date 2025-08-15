import os, sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'generated', 'py'))
from uniorm import create_client

client = create_client('http://localhost:6499')

created = client.user.create({'name': 'Alice'})
print('Created user', created)
users = client.user.find_many()
print('All users', users)
found = client.user.find_unique(created.id)
print('Found user', found)
updated = client.user.update(created.id, {'name': 'Alice Updated'})
print('Updated user', updated)
client.user.delete(created.id)
print('Deleted user')
