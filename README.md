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

The Weed Pressure - Coverage Visualizer is a web-based application designed to help farmers and agricultural professionals understand the impact of weed density and size on machine coverage and operational efficiency. By adjusting various parameters, users can simulate different field conditions and machine settings to make informed decisions.

## Features

- **Interactive Visualization**: Real-time updates of weed density and size on a graphical field representation.
- **Machine Size Selection**: Choose from various machine widths to see how it affects coverage and speed.
- **Adjustable Parameters**:
  - Weed Density (weeds per square foot)
  - Weed Size
  - Band Width (in inches)
- **Performance Metrics**:
  - Calculates acres covered per hour.
  - Displays speed in feet per minute and miles per hour.
- **Dynamic Acres Visualization**: Visual representation of acres covered per hour on a 10-acre field grid.

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

   - **Field View**: Displays the field with weeds based on your settings.
   - **Acres Covered per Hour**: Shows a grid representing acres covered per hour with your current settings.

3. **Analyze Performance Metrics**

   - Review the calculated shoot time, servo overhead, time per weed, and other performance metrics displayed under the controls.

## Project Structure

```
.
├── index.html       # Main HTML file
├── script.js        # JavaScript logic for interactivity
├── styles.css       # Custom styles
├── .gitignore       # Git ignore file
└── README.md        # Project documentation
```

## Technologies Used

- **HTML5**: Structure and layout.
- **CSS3**: Styling, including Tailwind CSS for rapid UI development.
- **JavaScript**: Interactive elements and calculations.
- **SVG**: Scalable Vector Graphics for rendering the field and weeds.
- **Tailwind CSS CDN**: Quick styling without local setup.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements.

## License

This project is licensed under the [MIT License](LICENSE). *(Add a LICENSE file with the MIT License text if you choose this license.)*

---

*Disclaimer: This tool is intended for educational and planning purposes. Actual field conditions may vary.*
