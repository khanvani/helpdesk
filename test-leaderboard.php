<?php
// Simple test script for leaderboard API
// This script helps test the API functionality

echo "<h2>Leaderboard API Test</h2>";

// Test different date ranges
$dateRanges = ['all', 'today', 'week', 'month', 'year'];
$topCounts = ['10', '20', 'all'];

foreach ($dateRanges as $dateRange) {
    echo "<h3>Testing Date Range: $dateRange</h3>";
    
    foreach ($topCounts as $topCount) {
        echo "<h4>Top Count: $topCount</h4>";
        
        // Prepare POST data
        $postData = [
            'dateRange' => $dateRange,
            'topCount' => $topCount
        ];
        
        // Make request to the API
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'http://localhost/helpdesk/php/leaderboard-api.php');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/x-www-form-urlencoded'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        echo "<p><strong>HTTP Code:</strong> $httpCode</p>";
        echo "<p><strong>Response:</strong></p>";
        echo "<pre>" . htmlspecialchars($response) . "</pre>";
        
        // Try to decode JSON response
        $jsonResponse = json_decode($response, true);
        if ($jsonResponse) {
            if (isset($jsonResponse['success']) && $jsonResponse['success']) {
                echo "<p><strong>Status:</strong> <span style='color: green;'>Success</span></p>";
                echo "<p><strong>Total Users:</strong> " . count($jsonResponse['data']) . "</p>";
                
                if (isset($jsonResponse['debug'])) {
                    echo "<p><strong>Debug Info:</strong></p>";
                    echo "<pre>" . print_r($jsonResponse['debug'], true) . "</pre>";
                }
                
                // Show first few users
                if (!empty($jsonResponse['data'])) {
                    echo "<p><strong>First 3 Users:</strong></p>";
                    echo "<ul>";
                    for ($i = 0; $i < min(3, count($jsonResponse['data'])); $i++) {
                        $user = $jsonResponse['data'][$i];
                        echo "<li>{$user['user']} - {$user['formCount']} forms - Last: {$user['lastActivity']}</li>";
                    }
                    echo "</ul>";
                }
            } else {
                echo "<p><strong>Status:</strong> <span style='color: red;'>Failed</span></p>";
                echo "<p><strong>Error:</strong> " . ($jsonResponse['message'] ?? 'Unknown error') . "</p>";
            }
        } else {
            echo "<p><strong>Status:</strong> <span style='color: red;'>Invalid JSON Response</span></p>";
        }
        
        echo "<hr>";
    }
}

echo "<h3>Test Complete</h3>";
echo "<p>Check the browser console and server logs for additional debugging information.</p>";
?> 