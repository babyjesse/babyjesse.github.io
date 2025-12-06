// Navigation functionality and initialize
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
    
    // Fetch rewards data on page load
    fetchRewardsData();
    
    // Refresh data every 5 minutes
    setInterval(fetchRewardsData, 5 * 60 * 1000);
});

// Copy contract address to clipboard
function copyContract() {
    const contractAddress = document.getElementById('contractAddress').textContent;
    const copyButton = document.getElementById('copyButton');
    
    navigator.clipboard.writeText(contractAddress).then(function() {
        // Update button text to show success
        const originalText = copyButton.textContent;
        copyButton.textContent = 'Copied!';
        copyButton.style.backgroundColor = '#4CAF50';
        
        // Reset button after 2 seconds
        setTimeout(function() {
            copyButton.textContent = originalText;
            copyButton.style.backgroundColor = '#000000';
        }, 2000);
    }).catch(function(err) {
        console.error('Failed to copy: ', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = contractAddress;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            copyButton.textContent = 'Copied!';
            copyButton.style.backgroundColor = '#4CAF50';
            setTimeout(function() {
                copyButton.textContent = 'Copy';
                copyButton.style.backgroundColor = '#000000';
            }, 2000);
        } catch (err) {
            console.error('Fallback copy failed: ', err);
        }
        document.body.removeChild(textArea);
    });
}

// Fetch and display rewards data
async function fetchRewardsData() {
    const contractAddress = '0xC989877eed7b424672AEF6AD92cD3119fd89C792';
    const baseRpcUrl = 'https://base.llamarpc.com';
    
    try {
        // Create provider for Base network
        const provider = new ethers.providers.JsonRpcProvider(baseRpcUrl);
        
        // ABI for reading public variable
        const abi = [
            {
                "inputs": [],
                "name": "totalDistributed",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        // Create contract instance
        const contract = new ethers.Contract(contractAddress, abi, provider);
        
        // Read totalDistributed (returns value in wei)
        const totalDistributedWei = await contract.totalDistributed();
        
        // Convert from wei to ETH (divide by 10^18)
        const totalDistributedETH = parseFloat(ethers.utils.formatEther(totalDistributedWei));
        
        // Fetch Jesse token price from DexScreener
        const dexscreenerUrl = 'https://api.dexscreener.com/token-pairs/v1/base/0x50F88fe97f72CD3E75b9Eb4f747F59BcEBA80d59';
        const response = await fetch(dexscreenerUrl);
        const data = await response.json();
        
        // Get the first pair's USD price
        // Note: DexScreener returns an array directly, or an object with pairs property
        let jessePriceUsd = 0;
        const pairs = Array.isArray(data) ? data : (data.pairs || []);
        if (pairs && pairs.length > 0) {
            // Find the pair with the best liquidity or use the first one with valid price
            const bestPair = pairs.find(pair => parseFloat(pair.priceUsd) > 0) || pairs[0];
            jessePriceUsd = parseFloat(bestPair.priceUsd);
        }
        
        // Calculate USD value (assuming ETH price, we'll use a simple conversion)
        // For Base network, we need ETH price. Let's fetch it or use a reasonable estimate
        // For now, let's use the ETH price from the DexScreener response if available
        // Otherwise, we'll need to fetch ETH price separately
        const ethPriceUsd = await fetchETHPrice();
        const totalDistributedUSD = totalDistributedETH * ethPriceUsd;
        
        // Calculate Jesse tokens (USD / Jesse price)
        const totalDistributedJesse = jessePriceUsd > 0 ? totalDistributedUSD / jessePriceUsd : 0;
        
        // Update the table
        updateRewardsTable(totalDistributedETH, totalDistributedUSD, totalDistributedJesse);
        
    } catch (error) {
        console.error('Error fetching rewards data:', error);
        updateRewardsTableError();
    }
}

// Fetch ETH price in USD
async function fetchETHPrice() {
    try {
        // Use CoinGecko API for ETH price
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        return data.ethereum?.usd || 3000; // Fallback to $3000 if API fails
    } catch (error) {
        console.error('Error fetching ETH price:', error);
        return 3000; // Fallback price
    }
}

// Update rewards table with data
function updateRewardsTable(eth, usd, jesse) {
    const tableBody = document.getElementById('rewardsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr>
            <td>Total Distributed (ETH)</td>
            <td>${eth.toLocaleString('en-US', { maximumFractionDigits: 6 })} ETH</td>
        </tr>
        <tr>
            <td>Total Distributed (USD)</td>
            <td>$${usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
        </tr>
        <tr>
            <td>Total Distributed (Jesse Tokens)</td>
            <td>${jesse.toLocaleString('en-US', { maximumFractionDigits: 2 })} JESSE</td>
        </tr>
    `;
}

// Update rewards table with error message
function updateRewardsTableError() {
    const tableBody = document.getElementById('rewardsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="2" style="text-align: center; color: #999999;">Error loading rewards data. Please try again later.</td>
        </tr>
    `;
}


