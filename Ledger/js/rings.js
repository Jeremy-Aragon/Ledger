// Draws category progress rings based on data-percent attribute.
// Radius must match the r value set on the .ring-progress circle in HTML.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.ring-progress').forEach(function (circle) {
    const r = parseFloat(circle.getAttribute('r'));
    const circumference = 2 * Math.PI * r;
    const percent = Math.min(100, parseFloat(circle.dataset.percent || '0'));
    circle.style.strokeDasharray = circumference.toFixed(2);
    circle.style.strokeDashoffset = (circumference * (1 - percent / 100)).toFixed(2);
  });
});
