// Seleciona o baralho e o texto de instrução
const baralho = document.getElementById('baralho');
const instrucao = document.getElementById('instrucao');

// Adiciona o evento de clique direto no baralho
baralho.addEventListener('click', () => {
    
    // Liga ou desliga a classe 'espalhado'
    baralho.classList.toggle('espalhado');

    // Faz o texto "Clique no baralho..." sumir quando as cartas abrem
    if (baralho.classList.contains('espalhado')) {
        instrucao.style.opacity = '0';
    } else {
        instrucao.style.opacity = '1';
    }
});