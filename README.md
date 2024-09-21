# Weed Pressure - Coverage Visualizer

An interactive tool for visualizing weed density, size, and machine coverage to optimize agricultural operations.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Demo](#demo)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [License](#license)

## Overview

The **Weed Pressure - Coverage Visualizer** is a web-based application designed to help farmers and agricultural professionals understand the impact of weed density and size on machine coverage and operational efficiency. By adjusting various parameters, users can simulate different field conditions and machine settings to make informed decisions.

## Features

- **Interactive Visualization**:
  - Real-time updates of weed density and size on a graphical field representation.
  - Visual representation of acres covered per hour on a 10-acre field grid.

- **Adjustable Parameters**:
  - **Weed Density**: Set the number of weeds per square foot.
  - **Weed Size**: Adjust the size of the weeds.
  - **Band Width**: Change the width of the treatment band in inches.
  - **Machine Size Selection**: Choose from various machine widths (6.6', 13.3', 20', 40', 60') to see how it affects coverage and speed.

- **Performance Metrics**:
  - **Speed Metrics**: Displays speed in feet per minute, miles per hour, and kilometers per hour.
  - **Weed Metrics**: Calculates shoot time, servo overhead, time per weed, lasers per band, and weeds in the treatment band.
  - **Acres per Hour**: Calculates and visualizes the number of acres covered per hour based on current settings.

- **Dynamic Acres Visualization**:
  - A 10x10 grid representing a 10-acre field, showing treated vs. untreated areas based on your settings.

- **Performance Data Dropdown**:
  - Expandable section that displays detailed performance data for in-depth analysis.

- **Performance Improvements Section**:
  - Password-protected section allowing authorized users to modify servo overhead and observe its impact on performance metrics.

## Demo

[Live Demo](#) *(Add link to live demo if available)*

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/Bryson-maka/coverage_visualizer.git
   ```

2. **Navigate to the Project Directory**

   ```bash
   cd coverage_visualizer
   ```

3. **Open the Application**

   Simply open the `index.html` file in your preferred web browser.

## Usage

1. **Adjust Controls**

   - **Weed Density Slider**: Move the slider to set the number of weeds per square foot.
   - **Weed Size Slider**: Adjust the size of the weeds.
   - **Band Width Slider**: Change the width of the treatment band in inches.
   - **Machine Size Options**: Select the machine width from the available options (6.6', 13.3', 20', 40', 60').

2. **View Visualizations**

   - **Field View**: Displays the field with weeds based on your settings, including a visual representation of the treatment band.
   - **Acres Covered per Hour**: Shows a grid representing acres covered per hour with your current settings. Treated areas are highlighted in red, while untreated areas remain green.

3. **Analyze Performance Metrics**

   - **Speed Metrics**: Review the calculated speed in mph, kph, ft/min, and m/min.
   - **Weed Metrics**: Check the number of weeds in the band, shoot time, servo overhead, time per weed, lasers per band, and total time for one square foot.
   - **Acres per Hour**: Observe how changes in settings affect the acres covered per hour.

4. **Use Dropdowns for Detailed Data**

   - **Performance Data Dropdown**: Click on "Show Performance Data" to expand and view detailed metrics.
   - **Performance Improvements Dropdown**: Click on "Show Performance Improvements" to access a password-protected section where you can modify servo overhead.

5. **Modify Servo Overhead (Authorized Users Only)**

   - Click on the **Modify** button in the Performance Improvements section.
   - **Enter Password**: Input the password to gain access.
   - **Adjust Servo Overhead Slider**: Modify the servo overhead value and observe the impact on performance metrics.

## Project Structure

```
.
├── index.html       # Main HTML file with updated controls and visualizations
├── script.js        # JavaScript logic for interactivity and calculations
├── styles.css       # Custom styles
├── .gitignore       # Git ignore file
└── README.md        # Project documentation
```

## Technologies Used

- **HTML5**: Structure and layout.
- **CSS3**: Styling, including Tailwind CSS for rapid UI development.
- **JavaScript**: Interactive elements and calculations.
- **SVG**: Scalable Vector Graphics for rendering the field, weeds, and acres visualization.
- **Tailwind CSS CDN**: Quick styling without local setup.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements.

## License

This project is licensed under the [MIT License](LICENSE). *(Add a LICENSE file with the MIT License text if you choose this license.)*

---

*Disclaimer: This tool is intended for educational and planning purposes. Actual field conditions may vary.*

---

**Changelog**:

- **Added Machine Size Selection**: Users can now select different machine widths to simulate their impact on operational efficiency.
- **Performance Metrics Expanded**: Additional metrics such as lasers per band, total time for 1 sq ft, and multiple speed units are now displayed.
- **Acres Visualization Enhanced**: The acres per hour visualization now uses a 10x10 grid to represent a 10-acre field, highlighting treated and untreated areas.
- **Dropdown Sections Introduced**:
  - **Performance Data**: A collapsible section that provides detailed performance metrics.
  - **Performance Improvements**: A password-protected section for authorized users to modify servo overhead.
- **Password-Protected Editing**: Implemented a secure way to modify sensitive parameters, ensuring that only authorized personnel can make changes.