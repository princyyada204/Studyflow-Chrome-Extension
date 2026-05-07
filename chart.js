// chart.js - Custom chart implementation without external dependencies

class SimpleChart {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      type: 'bar',
      data: {
        labels: [],
        datasets: []
      },
      ...options
    };
    this.render();
  }
  
  render() {
    if (this.options.type === 'bar') {
      this.renderBarChart();
    }
  }
  
  renderBarChart() {
    const { labels, datasets } = this.options.data;
    const dataset = datasets[0];
    
    this.container.innerHTML = '';
    this.container.style.display = 'flex';
    this.container.style.alignItems = 'flex-end';
    this.container.style.justifyContent = 'space-between';
    this.container.style.height = '80px';
    this.container.style.gap = '8px';
    this.container.style.marginTop = '12px';
    
    labels.forEach((label, index) => {
      const barContainer = document.createElement('div');
      barContainer.style.flex = '1';
      barContainer.style.display = 'flex';
      barContainer.style.flexDirection = 'column';
      barContainer.style.alignItems = 'center';
      barContainer.style.position = 'relative';
      
      const bar = document.createElement('div');
      const value = dataset.data[index] || 0;
      const maxValue = Math.max(...dataset.data, 1);
      const height = Math.max((value / maxValue) * 100, 5);
      
      bar.style.background = dataset.backgroundColor || '#5c6ac4';
      bar.style.borderRadius = '4px 4px 0 0';
      bar.style.height = height + '%';
      bar.style.width = '100%';
      bar.style.minHeight = '4px';
      bar.style.transition = 'height 0.3s ease';
      
      const labelEl = document.createElement('div');
      labelEl.textContent = label;
      labelEl.style.fontSize = '0.8em';
      labelEl.style.color = '#666';
      labelEl.style.marginTop = '4px';
      
      barContainer.appendChild(bar);
      barContainer.appendChild(labelEl);
      this.container.appendChild(barContainer);
    });
  }
  
  updateData(newData) {
    this.options.data = { ...this.options.data, ...newData };
    this.render();
  }
}

// Export for use in other files
window.SimpleChart = SimpleChart;