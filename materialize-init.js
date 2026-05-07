// materialize-init.js - Initialize Materialize components without external CDN

// Simple form functionality without external dependencies
document.addEventListener('DOMContentLoaded', function() {
  // Initialize form labels
  const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input[type="time"], input[type="url"]');
  inputs.forEach(input => {
    const label = input.parentNode.querySelector('label');
    if (label && input.value) {
      label.classList.add('active');
    }
    
    input.addEventListener('focus', function() {
      if (label) label.classList.add('active');
    });
    
    input.addEventListener('blur', function() {
      if (label && !input.value) {
        label.classList.remove('active');
      }
    });
    
    input.addEventListener('input', function() {
      if (label) {
        if (input.value) {
          label.classList.add('active');
        } else {
          label.classList.remove('active');
        }
      }
    });
  });
  
  // Simple button wave effect
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(button => {
    button.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple');
      
      button.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });
});

// Add CSS for ripple effect
const style = document.createElement('style');
style.textContent = `
  .btn {
    position: relative;
    overflow: hidden;
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: ripple-animation 0.6s linear;
    pointer-events: none;
  }
  
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);