let currentInput = '0';
let previousInput = '';
let operation = null;
let shouldResetScreen = false;
let isFontMinimized = false;
let settings = {
    digitGrouping: false,
    decimalPlaces: 2,
    vibrationFeedback: false
};

// 缓存DOM元素
const display = document.getElementById('display');
const historyDisplay = document.getElementById('history');
const overflowIndicator = document.getElementById('overflowIndicator');
const themeToggle = document.getElementById('themeToggle');
const settingsButton = document.getElementById('settingsButton');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const digitGroupingToggle = document.getElementById('digitGrouping');
const decimalPlacesSelect = document.getElementById('decimalPlaces');
const vibrationFeedbackToggle = document.getElementById('vibrationFeedback');
const landscapeWarning = document.querySelector('.landscape-warning');
const calculatorElement = document.querySelector('.calculator');
const navBarElement = document.querySelector('.nav-bar');

// 打赏相关DOM元素
const donateImage = document.getElementById('donateImage');
const donateModal = document.getElementById('donateModal');
const closeDonate = document.getElementById('closeDonate');

// 性能优化变量
let updateDisplayTimeout = null;
let checkOrientationTimeout = null;
let adjustLayoutTimeout = null;

function initSettings() {
    const savedSettings = localStorage.getItem('calculatorSettings');
    if (savedSettings) {
        try {
            settings = JSON.parse(savedSettings);
            digitGroupingToggle.checked = settings.digitGrouping;
            decimalPlacesSelect.value = settings.decimalPlaces;
            vibrationFeedbackToggle.checked = settings.vibrationFeedback;
        } catch (e) {
            console.error('Settings parse error:', e);
            // 使用默认设置
            settings = {
                digitGrouping: false,
                decimalPlaces: 2,
                vibrationFeedback: false
            };
        }
    }
}

function saveSettings() {
    localStorage.setItem('calculatorSettings', JSON.stringify(settings));
    updateDisplay();
}

function initTheme() {
    const savedTheme = localStorage.getItem('calculatorTheme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.remove('light-mode');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

function toggleTheme() {
    if (document.body.classList.contains('light-mode')) {
        document.body.classList.remove('light-mode');
        localStorage.setItem('calculatorTheme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.body.classList.add('light-mode');
        localStorage.setItem('calculatorTheme', 'light');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function triggerVibration() {
    if (settings.vibrationFeedback && navigator.vibrate) {
        try {
            navigator.vibrate(30);
        } catch (e) {
            // 忽略振动错误
        }
    }
}

function updateDisplay() {
    // 清除之前的超时
    if (updateDisplayTimeout) {
        clearTimeout(updateDisplayTimeout);
    }
    
    // 使用防抖技术，延迟更新显示
    updateDisplayTimeout = setTimeout(() => {
        let effectiveLength = currentInput.startsWith('-') ? currentInput.length - 1 : currentInput.length;
        if (effectiveLength > 15) {
            if (currentInput.startsWith('-')) {
                currentInput = '-' + currentInput.substring(1, 16);
            } else {
                currentInput = currentInput.substring(0, 15);
            }
        }
        
        let displayValue = currentInput;
        if (settings.digitGrouping && !isNaN(currentInput) && currentInput !== '错误') {
            const num = parseFloat(currentInput);
            if (!isNaN(num)) {
                if (Number.isInteger(num)) {
                    displayValue = num.toLocaleString('zh-CN');
                } else {
                    const parts = currentInput.split('.');
                    const integerPart = parseFloat(parts[0]).toLocaleString('zh-CN');
                    displayValue = integerPart + '.' + parts[1];
                }
            }
        }
        
        // 直接设置文本，避免频繁的DOM操作
        display.textContent = displayValue.replace(/\*/g, '×').replace(/\//g, '÷');
        
        if (!isFontMinimized) {
            adjustFontSize();
        }
        
        checkOverflow();
    }, 0);
}

function updateHistory() {
    if (previousInput && operation) {
        let historyText = `${previousInput} ${operation.replace(/\*/g, '×').replace(/\*/g, '×').replace(/\//g, '÷')}`;
        if (historyText.length > 20) {
            historyText = historyText.substring(0, 20) + '...';
        }
        historyDisplay.textContent = historyText;
        
        adjustHistoryFontSize();
    } else {
        historyDisplay.textContent = '';
    }
}

function updateCalculationHistory(historyText) {
    if (historyText) {
        if (historyText.length > 30) {
            historyText = historyText.substring(0, 30) + '...';
        }
        historyDisplay.textContent = historyText;
        
        adjustHistoryFontSize();
    }
}

function checkOverflow() {
    // 使用requestAnimationFrame进行更流畅的检查
    requestAnimationFrame(() => {
        if (display.scrollWidth > display.clientWidth) {
            overflowIndicator.classList.add('show');
            
            if (!isFontMinimized) {
                if (display.classList.contains('xxxsmall-font')) {
                    isFontMinimized = true;
                } else if (display.classList.contains('xxsmall-font')) {
                    display.classList.remove('xxsmall-font');
                    display.classList.add('xxxsmall-font');
                    isFontMinimized = true;
                } else if (display.classList.contains('xsmall-font')) {
                    display.classList.remove('xsmall-font');
                    display.classList.add('xxsmall-font');
                } else if (display.classList.contains('small-font')) {
                    display.classList.remove('small-font');
                    display.classList.add('xsmall-font');
                } else if (display.classList.contains('medium-font')) {
                    display.classList.remove('medium-font');
                    display.classList.add('small-font');
                } else {
                    display.classList.add('medium-font');
                }
                
                // 避免递归调用，直接再次检查
                requestAnimationFrame(() => {
                    if (display.scrollWidth > display.clientWidth) {
                        overflowIndicator.classList.add('show');
                    } else {
                        overflowIndicator.classList.remove('show');
                    }
                });
            }
        } else {
            overflowIndicator.classList.remove('show');
        }
    });
}

function adjustFontSize() {
    // 避免频繁的类操作
    const currentFontClasses = ['medium-font', 'small-font', 'xsmall-font', 'xxsmall-font', 'xxxsmall-font'];
    let hasFontClass = false;
    
    for (const fontClass of currentFontClasses) {
        if (display.classList.contains(fontClass)) {
            hasFontClass = true;
            break;
        }
    }
    
    if (!isFontMinimized && !hasFontClass) {
        let valueToCheck = currentInput;
        if (settings.digitGrouping) {
            valueToCheck = valueToCheck.replace(/,/g, '');
        }
        const effectiveLength = valueToCheck.startsWith('-') ? valueToCheck.length - 1 : valueToCheck.length;
        
        // 批量移除所有字体类，然后添加一个
        display.classList.remove(...currentFontClasses);
        
        if (effectiveLength > 12) {
            display.classList.add('xsmall-font');
        } else if (effectiveLength > 9) {
            display.classList.add('small-font');
        } else if (effectiveLength > 6) {
            display.classList.add('medium-font');
        }
        
        isFontMinimized = false;
    }
}

function adjustHistoryFontSize() {
    const length = historyDisplay.textContent.length;
    
    // 批量操作类
    historyDisplay.classList.remove('medium-font', 'small-font', 'xsmall-font');
    
    if (length > 30) {
        historyDisplay.classList.add('xsmall-font');
    } else if (length > 25) {
        historyDisplay.classList.add('small-font');
    } else if (length > 20) {
        historyDisplay.classList.add('medium-font');
    }
}

function appendNumber(number) {
    triggerVibration();
    
    if (currentInput === '错误') {
        currentInput = '0';
        isFontMinimized = false;
        display.classList.remove('medium-font', 'small-font', 'xsmall-font', 'xxsmall-font', 'xxxsmall-font');
    }
    
    if (currentInput === '0' || shouldResetScreen) {
        currentInput = number;
        shouldResetScreen = false;
    } else {
        let valueToCheck = currentInput;
        if (settings.digitGrouping) {
            valueToCheck = valueToCheck.replace(/,/g, '');
        }
        const effectiveLength = valueToCheck.startsWith('-') ? valueToCheck.length - 1 : valueToCheck.length;
        
        if (effectiveLength < 15) {
            currentInput += number;
        }
    }
    updateDisplay();
}

function appendOperator(op) {
    triggerVibration();
    
    if (currentInput === '错误') return;
    
    calculate();
    previousInput = currentInput;
    operation = op;
    shouldResetScreen = true;
    updateHistory();
}

function appendDecimal() {
    triggerVibration();
    
    if (currentInput === '错误') {
        currentInput = '0';
        isFontMinimized = false;
        display.classList.remove('medium-font', 'small-font', 'xsmall-font', 'xxsmall-font', 'xxxsmall-font');
    }
    
    if (shouldResetScreen) {
        currentInput = '0.';
        shouldResetScreen = false;
    } else if (!currentInput.includes('.')) {
        let valueToCheck = currentInput;
        if (settings.digitGrouping) {
            valueToCheck = valueToCheck.replace(/,/g, '');
        }
        const effectiveLength = valueToCheck.startsWith('-') ? valueToCheck.length - 1 : valueToCheck.length;
        
        if (effectiveLength < 15) {
            currentInput += '.';
        }
    }
    updateDisplay();
}

function clearAll() {
    triggerVibration();
    
    currentInput = '0';
    previousInput = '';
    operation = null;
    isFontMinimized = false;
    
    // 批量移除类
    display.classList.remove('medium-font', 'small-font', 'xsmall-font', 'xxsmall-font', 'xxxsmall-font');
    historyDisplay.classList.remove('medium-font', 'small-font', 'xsmall-font');
    overflowIndicator.classList.remove('show');
    
    updateDisplay();
    updateHistory();
}

function clearEntry() {
    triggerVibration();
    
    if (currentInput === '错误') {
        currentInput = '0';
    } else {
        currentInput = '0';
    }
    updateDisplay();
}

function appendPercent() {
    triggerVibration();
    
    if (currentInput === '错误') return;
    
    const num = parseFloat(currentInput);
    if (!isNaN(num)) {
        currentInput = (num / 100).toString();
        updateDisplay();
    }
}

function toggleSign() {
    triggerVibration();
    
    if (currentInput === '错误') return;
    
    if (currentInput === '0' || currentInput === '-0') {
        return;
    }
    
    currentInput = currentInput.startsWith('-') 
        ? currentInput.slice(1) 
        : '-' + currentInput;
    updateDisplay();
}

function calculate() {
    triggerVibration();
    
    if (operation === null || shouldResetScreen || currentInput === '错误') return;
    
    let computation;
    const prev = parseFloat(previousInput.replace(/,/g, ''));
    const current = parseFloat(currentInput.replace(/,/g, ''));
    
    if (isNaN(prev) || isNaN(current)) return;
    
    switch (operation) {
        case '+':
            computation = prev + current;
            break;
        case '-':
            computation = prev - current;
            break;
        case '*':
            computation = prev * current;
            break;
        case '/':
            if (current === 0) {
                computation = '错误';
            } else {
                computation = prev / current;
            }
            break;
        default:
            return;
    }
    
    if (typeof computation === 'number' && computation !== '错误') {
        if (computation.toString().includes('e')) {
            // 使用更高效的方式处理科学计数法
            try {
                computation = parseFloat(computation.toPrecision(15));
            } catch (e) {
                computation = parseFloat(computation.toFixed(15));
            }
        }
        
        const decimalPlaces = parseInt(settings.decimalPlaces);
        // 避免不必要的toFixed调用
        if (decimalPlaces >= 0 && decimalPlaces <= 20) {
            computation = parseFloat(computation.toFixed(decimalPlaces));
        }
        currentInput = computation.toString();
        
        const historyText = `${prev} ${operation.replace(/\*/g, '×').replace(/\*/g, '×').replace(/\//g, '÷')} ${current} = ${currentInput}`;
        updateCalculationHistory(historyText);
    } else {
        currentInput = computation;
    }
    
    operation = null;
    previousInput = '';
    shouldResetScreen = true;
    updateDisplay();
}

function calculateScientific(func) {
    triggerVibration();
    
    if (currentInput === '错误') {
        currentInput = '0';
        isFontMinimized = false;
        display.classList.remove('medium-font', 'small-font', 'xsmall-font', 'xxsmall-font', 'xxxsmall-font');
    }
    
    const num = parseFloat(currentInput);
    if (isNaN(num)) return;
    
    let result;
    switch (func) {
        case 'sin':
            result = Math.sin(num * Math.PI / 180);
            break;
        case 'cos':
            result = Math.cos(num * Math.PI / 180);
            break;
        case 'tan':
            result = Math.tan(num * Math.PI / 180);
            break;
        case 'cot':
            const tanValue = Math.tan(num * Math.PI / 180);
            if (Math.abs(tanValue) < 1e-10) {
                result = '错误';
            } else {
                result = 1 / tanValue;
            }
            break;
        default:
            return;
    }
    
    if (result.toString().includes('e')) {
        try {
            result = parseFloat(result.toPrecision(15));
        } catch (e) {
            result = parseFloat(result.toFixed(15));
        }
    }
    
    const decimalPlaces = parseInt(settings.decimalPlaces);
    if (typeof result === 'number') {
        if (decimalPlaces >= 0 && decimalPlaces <= 20) {
            result = parseFloat(result.toFixed(decimalPlaces));
        }
    }
    
    currentInput = result.toString();
    shouldResetScreen = true;
    updateDisplay();
    
    if (result !== '错误') {
        const historyText = `${func}(${num}) = ${currentInput}`;
        updateCalculationHistory(historyText);
    }
    
    previousInput = `${func}(${num})`;
    operation = null;
}

function toggleSettings() {
    triggerVibration();
    settingsModal.classList.toggle('active');
}

// 打赏相关功能
function setupDonateFunctionality() {
    if (donateImage) {
        donateImage.addEventListener('click', function() {
            triggerVibration();
            donateModal.classList.add('active');
        });
    }
    
    if (closeDonate) {
        closeDonate.addEventListener('click', function() {
            triggerVibration();
            donateModal.classList.remove('active');
        });
    }
    
    if (donateModal) {
        donateModal.addEventListener('click', function(e) {
            if (e.target === donateModal) {
                donateModal.classList.remove('active');
            }
        });
    }
}

// 方向检测函数（使用防抖）
function checkOrientation() {
    if (checkOrientationTimeout) {
        clearTimeout(checkOrientationTimeout);
    }
    
    checkOrientationTimeout = setTimeout(() => {
        const isLandscape = window.innerWidth > window.innerHeight;
        const isSmallScreen = window.innerHeight <= 600 && window.innerWidth <= 900;
        const isTablet = window.innerWidth >= 901;
        
        if (isLandscape && isSmallScreen && !isTablet) {
            // 手机横屏：显示警告
            landscapeWarning.style.display = 'flex';
            calculatorElement.style.display = 'none';
            navBarElement.style.display = 'none';
            if (settingsModal.classList.contains('active')) {
                settingsModal.style.display = 'none';
            }
            if (donateModal.classList.contains('active')) {
                donateModal.style.display = 'none';
            }
        } else {
            // 正常情况或平板横屏
            landscapeWarning.style.display = 'none';
            calculatorElement.style.display = 'flex';
            navBarElement.style.display = 'flex';
            if (settingsModal.classList.contains('active')) {
                settingsModal.style.display = 'flex';
            }
            if (donateModal.classList.contains('active')) {
                donateModal.style.display = 'flex';
            }
            
            // 调整横屏布局
            adjustLandscapeLayout();
        }
    }, 100);
}

// 横屏布局调整（使用防抖）
function adjustLandscapeLayout() {
    if (adjustLayoutTimeout) {
        clearTimeout(adjustLayoutTimeout);
    }
    
    adjustLayoutTimeout = setTimeout(() => {
        const isLandscape = window.innerWidth > window.innerHeight;
        const isTablet = window.innerWidth >= 901;
        
        if (isLandscape && isTablet) {
            const buttonsContainer = document.querySelector('.buttons-container');
            const scientificButtons = document.querySelector('.scientific-buttons');
            const buttons = document.querySelector('.buttons');
            
            if (buttonsContainer && buttons) {
                // 确保科学计算按钮显示
                if (scientificButtons) {
                    scientificButtons.style.display = 'grid';
                }
                
                // 调整按钮容器高度
                buttonsContainer.style.height = '100%';
                
                // 设置按钮网格高度
                if (scientificButtons) {
                    const scientificHeight = scientificButtons.clientHeight;
                    buttons.style.height = `calc(100% - ${scientificHeight}px)`;
                } else {
                    buttons.style.height = '100%';
                }
                
                buttons.style.minHeight = '0';
                buttons.style.gridAutoRows = '1fr';
                
                // 修复0按钮
                const zeroButton = document.querySelector('.zero');
                if (zeroButton) {
                    zeroButton.style.height = '100%';
                    zeroButton.style.alignItems = 'center';
                    zeroButton.style.justifyContent = 'center';
                }
            }
        }
    }, 100);
}

// 初始化
function init() {
    updateDisplay();
    initTheme();
    initSettings();
    setupDonateFunctionality();
    checkOrientation();
    
    setTimeout(adjustLandscapeLayout, 100);
}

// 事件监听器
themeToggle.addEventListener('click', toggleTheme);
settingsButton.addEventListener('click', toggleSettings);
closeSettings.addEventListener('click', toggleSettings);

digitGroupingToggle.addEventListener('change', function() {
    settings.digitGrouping = this.checked;
    saveSettings();
});

decimalPlacesSelect.addEventListener('change', function() {
    settings.decimalPlaces = parseInt(this.value);
    saveSettings();
});

vibrationFeedbackToggle.addEventListener('change', function() {
    settings.vibrationFeedback = this.checked;
    saveSettings();
});

settingsModal.addEventListener('click', function(e) {
    if (e.target === settingsModal) {
        toggleSettings();
    }
});

// 阻止默认行为
document.addEventListener('dblclick', function(e) {
    e.preventDefault();
}, { passive: false });

document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
});

// 使用防抖的事件监听
let resizeTimeout;
function handleResize() {
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(() => {
        checkOrientation();
        adjustLandscapeLayout();
    }, 150);
}

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);

// 初始化应用
init();