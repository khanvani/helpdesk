# Leaderboard Feature Documentation

## Overview

The Leaderboard feature displays a bar chart and table showing the performance of sewadars based on the number of forms they have completed. The data is sourced from the AccessLog table in the Zonal Data Google Sheet.

## Files Created/Modified

### New Files:

1. **`leaderboard.html`** - Main leaderboard page with interactive chart and table
2. **`php/leaderboard-api.php`** - Backend API to fetch leaderboard data
3. **`test-leaderboard.html`** - Test page to verify API functionality

### Modified Files:

1. **`php/config.php`** - Added leaderboard-api.php to permissions
2. **`index.html`** - Added leaderboard navigation link
3. **`sewajatha.html`** - Added leaderboard navigation link

## Features

### Frontend (leaderboard.html)

- **Interactive Bar Chart**: Visual representation of sewadar performance using Chart.js
- **Data Table**: Detailed table with ranking, names, Gr numbers, form counts, and last activity
- **Filtering Options**:
  - Date Range: All Time, Today, This Week, This Month, This Year
  - Top Count: Top 10, Top 20, Top 50, All
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Refresh button to fetch latest data
- **Authentication**: Integrates with existing login system

### Backend (leaderboard-api.php)

- **Google Sheets Integration**: Reads data from AccessLog table
- **Duplicate Detection**: Ignores duplicate entries based on unique request identifiers
- **Date Filtering**: Filters data based on selected date range
- **Data Processing**: Counts forms per user and tracks last activity
- **Authentication**: Uses existing API key system
- **Error Handling**: Comprehensive error handling and logging

## Data Source

The leaderboard data comes from the **AccessLog** sheet in the **Zonal Data** Google Sheet with the following structure:

| Column | Field   | Description           |
| ------ | ------- | --------------------- |
| A      | Gr No   | Sewadar's Gr Number   |
| B      | Request | Form/Request details  |
| C      | User    | Sewadar name          |
| D      | Time    | Timestamp of activity |
| E      | Date    | Date of activity      |

## API Endpoint

### URL: `php/leaderboard-api.php`

### Method: POST

### Parameters:

- `api_key`: Base64 encoded authentication key
- `dateRange`: Date filter (all, today, week, month, year)
- `topCount`: Number of top performers to return (10, 20, 50, all)

### Response Format:

```json
{
  "success": true,
  "data": [
    {
      "user": "Sewadar Name",
      "grNo": "GR123",
      "formCount": 15,
      "lastActivity": "2024-01-15 14:30:00"
    }
  ],
  "total": 10,
  "dateRange": "all",
  "topCount": "10"
}
```

## Installation & Setup

1. **Ensure Google Sheets API is configured**:

   - Verify `rssba-2024-5298a975b00c.json` credentials file exists
   - Ensure Zonal Data spreadsheet is accessible

2. **Update Spreadsheet ID** (if needed):

   - The API uses the `ZONAL_DATA_SPREADSHEET` constant from config.php
   - Current ID: `14vCQhhkaCWnUPqRkzUBp5RaIDiXalM_-TgvhqXG2krA`

3. **Test the API**:
   - Open `test-leaderboard.html` in browser
   - Click "Test API" to verify connection
   - Test with different parameters

## Usage

1. **Access Leaderboard**:

   - Navigate to any page in the application
   - Click the "Leaderboard" link in the navigation menu
   - Or directly access `leaderboard.html`

2. **View Data**:

   - The page loads with default settings (All Time, Top 10)
   - Bar chart shows visual representation
   - Table shows detailed rankings

3. **Filter Data**:

   - Use Date Range dropdown to filter by time period
   - Use Top Count dropdown to show more/fewer results
   - Changes automatically refresh the chart and table

4. **Refresh Data**:
   - Click the refresh button to fetch latest data from Google Sheets

## Permissions

The leaderboard API uses the **Zonal Data authentication** (`r$$bZ2025` permission level) and requires the `API_KEYS.ZONAL` key, which is already configured in the system.

## Troubleshooting

### Common Issues:

1. **"Access Denied" Error**:

   - Ensure user has correct permission level
   - Check if API key is properly stored in localStorage

2. **"No data found" Error**:

   - Verify AccessLog sheet exists in Zonal Data spreadsheet
   - Check if sheet has data in columns A-E

3. **Chart not displaying**:

   - Ensure Chart.js CDN is accessible
   - Check browser console for JavaScript errors

4. **API connection issues**:
   - Verify Google Sheets API credentials
   - Check network connectivity
   - Use test-leaderboard.html to debug

### Testing:

Use `test-leaderboard.html` to:

- Test API connectivity
- Verify authentication
- Test different parameters
- Debug response format

## Security Considerations

- API uses existing authentication system
- Duplicate detection prevents data manipulation
- Input validation on all parameters
- Error messages don't expose sensitive information

## Performance Notes

- Data is processed server-side to reduce client load
- Chart rendering is optimized for large datasets
- Pagination in table for better performance
- Caching can be implemented if needed

## Future Enhancements

Potential improvements:

- Export functionality (PDF/Excel)
- Real-time updates via WebSocket
- Advanced filtering options
- Performance analytics
- Historical trend charts
- Email notifications for top performers
