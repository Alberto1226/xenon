<script>
    import 'bootstrap/dist/css/bootstrap.min.css';
    
    // Estado para los select y los inputs de fechas
    let sortBy = 'name';
    let startDate = '';
    let endDate = '';
  
    // Opciones de ordenación
    const sortOptions = [
      { value: 'name', label: 'Name' },
      { value: 'age', label: 'Age' },
      { value: 'position', label: 'Position' },
    ];
  
    // Datos estáticos para mostrar en la tabla
    let tableData = [
      { name: 'John Doe', age: 30, position: 'Developer', start: '2023-01-01', end: '2023-06-30' },
      { name: 'Jane Smith', age: 25, position: 'Designer', start: '2023-02-15', end: '2023-07-20' },
      { name: 'Mike Johnson', age: 35, position: 'Manager', start: '2023-03-10', end: '2023-08-30' },
      { name: 'Emily Davis', age: 28, position: 'Marketer', start: '2023-04-05', end: '2023-09-15' },
      { name: 'David Brown', age: 32, position: 'Analyst', start: '2023-05-25', end: '2023-10-10' },
      { name: 'Lucy White', age: 27, position: 'HR', start: '2023-06-20', end: '2023-11-05' },
    ];
  
    // Función para simular el filtrado de datos por rango de fechas
    function filterData() {
      if (startDate && endDate) {
        return tableData.filter(
          (item) => item.start >= startDate && item.end <= endDate
        );
      }
      return tableData;
    }
  </script>
  
  <style>
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem;
    }
  
    .filters {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
  
    .filters select,
    .filters input {
      margin-right: 1rem;
    }
  
    table {
      width: 100%;
      border-collapse: collapse;
    }
  
    table, th, td {
      border: 1px solid #ddd;
    }
  
    th, td {
      padding: 8px;
      text-align: left;
    }
  
    th {
      background-color: #f4f4f4;
    }
  </style>
  
  <div class="container">
    <!-- Filtros -->
    <div class="filters">
      <!-- Ordenar por -->
      <div>
        <label for="sortBy">Order by:</label>
        <select id="sortBy" bind:value={sortBy}>
          {#each sortOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
  
      <!-- Rango de fechas -->
      <div>
        <label for="startDate">Start Date:</label>
        <input type="date" id="startDate" bind:value={startDate} />
  
        <label for="endDate">End Date:</label>
        <input type="date" id="endDate" bind:value={endDate} />
      </div>
    </div>
  
    <!-- Tabla de datos -->
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Age</th>
          <th>Position</th>
          <th>Start Date</th>
          <th>End Date</th>
        </tr>
      </thead>
      <tbody>
        {#each filterData() as row}
          <tr>
            <td>{row.name}</td>
            <td>{row.age}</td>
            <td>{row.position}</td>
            <td>{row.start}</td>
            <td>{row.end}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  