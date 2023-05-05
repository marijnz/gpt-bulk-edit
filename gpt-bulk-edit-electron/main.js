const { ipcRenderer } = require('electron');
const fs = require('fs');
const { Configuration, OpenAIApi } = require("openai");

const dropZone = document.getElementById('drop-zone');
const fileTable = document.getElementById('file-table');
const queryText = document.getElementById('query-text');
const goButton = document.getElementById('go-button');


// Drag and drop functionality
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'copy';
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  const files = e.dataTransfer.files;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${file.path}</td>
      <td><span class="badge badge-secondary">Pending</span></td>
      <td><button class="btn btn-danger btn-sm remove-btn">Remove</button></td>
    `;
    fileTable.querySelector('tbody').appendChild(row);
  }
});

// Remove files from table
fileTable.addEventListener('click', (e) => {
  if (e.target.classList.contains('remove-btn')) {
    e.target.closest('tr').remove();
  }
});

// Send GPT-4 queries on GO button click
goButton.addEventListener('click', () => {
  const query = queryText.value;
  if (!query) return;

  const rows = fileTable.querySelectorAll('tbody tr');
  rows.forEach((row, index) => {
    const filename = row.querySelector('td').textContent;
    console.log(filename);
    const status = row.querySelector('span');
    
    // Read file content
    fs.readFile(filename, 'utf8', (err, fileContent) => {
      if (err) {
        console.error(err);
        return;
      }

      // Send GPT-4 query with file content and text area content
      // Replace this part with your GPT-4 API call
      sendGPT4Query(fileContent, query)
        .then((response) => {
          status.textContent = 'Completed';
          status.classList.remove('badge-secondary');
          status.classList.add('badge-success');
          if(response == 'NOCHANGE') {
            return;
          }
          fs.writeFile(filename, response, (err) => {
            if (err) {
              console.error(err);
              return;
            }
          });
        })
        .catch((error) => {
          console.error(error);
        });
    });
  });
});

// Example function to simulate GPT-4 query
async function sendGPT4Query(fileContent, query) {
  try {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    delete configuration.baseOptions.headers['User-Agent'];
    const openai = new OpenAIApi(configuration);

    console.log(`${query}\nfile: ${fileContent}`)
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
       messages: [
        {"role": "system", "content": "You're a file editing bot. You ALWAYS respond with ONLY the changed contents of the file. If you think there's nothing to change, respond only with NOCHANGE. NEVER return anything else, do NOT give explanations."},
        {"role": "user", "content": `${query}\n\nfile\n: ${fileContent}`},
      ],
      temperature: 0.7,
    });
    console.log(completion.data);
    console.log(completion.data.choices[0].message.content);

    return Promise.resolve(completion.data.choices[0].message.content);
  } catch (error) {
    console.error(error);
    return Promise.reject(error);
  }
}
