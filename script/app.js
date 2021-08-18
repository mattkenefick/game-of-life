
// ┌──────────────────────────────────────────────────────────────────────────────┐
// │                                                                              │
// │ The Game of Life                                                             │
// │                                                                              │
// │ This was inspired by a post I read this morning. Apparently it's a popular   │
// │ riddle-style test question asked by out-of-touch companies like Google       │
// │ and Facebook.                                                                │
// │                                                                              │
// │ It looked like fun, so I played with it this morning.                        │
// │                                                                              │
// └──────────────────────────────────────────────────────────────────────────────┘


// Settings
// ----------------------------------------------------------------------------

const STATE_ALIVE = 'a';
const STATE_LIVE = STATE_ALIVE;
const STATE_DEAD = 'd';

const inputColumns = document.querySelector('[name=columns]');
const inputIterations = document.querySelector('[name=iterations]');
const inputRows = document.querySelector('[name=rows]');


// Web Display
// ----------------------------------------------------------------------------

/**
 * Board
 *
 * This class primarily deals with displaying data from the
 * logic class onto a DOM board.
 *
 * The more interesting stuff happens in LifeLogic
 */
class Board
{
    /**
     * Options:
     *     block_size
     *     columns
     *     logic
     *     rows
     */
    constructor(params = {}) {
        this.block_size = params.block_size || 30;
        this.columns = params.columns || 10;
        this.logic = params.logic.setBoard(this);
        this.rows = params.rows || 10;

        // Create the board
        this.element = document.createElement('div');
        this.element.classList.add('board');

        // Set random data
        if (!this.logic.data.length) {
            this.logic.generateRandomData();
        }

        // Unset data, set size, and set introduction data
        this.reset();

        // Display
        this.display();
    }

    /**
     * Apply data to the board
     *
     * @return void
     */
    display() {
        this.logic.data.forEach((value, index) => this.addItem(value, index));
    }

    /**
     * Reset board
     *
     * @return this
     */
    reset() {
        this.updateSize();
        this.element.innerHTML = '';

        return this;
    }

    /**
     * Change size of board
     * Can change data if board size changes
     *
     * @params int|null rows
     * @params int|null columns
     * @return this
     */
    updateSize(rows, columns) {
        this.rows = parseFloat(rows || this.rows);
        this.columns = parseFloat(columns || this.columns);

        // Seed new data if we change rows or columns
        if (rows || columns) {
            this.logic.generateRandomData();
        }

        this.element.style.height = this.rows * this.block_size + 'px';
        this.element.style.width = this.columns * this.block_size + 'px';

        return this;
    }

    /**
     * Determines our block type and puts it on the board
     * Re-use existing blocks so we don't continually add to the DOM
     *
     * @param string value
     * @param int index
     * @param HTMLElement board
     * @return void
     */
    addItem(value, index) {
        let block;

        // look for existing
        if (block = document.querySelector('.item-' + index)) {
            block.classList.remove('filled');
        }
        else {
            block = document.createElement('div');
            block.classList.add('item-' + index);
            block.classList.add('block');

            // Add block to board
            this.element.appendChild(block);
        }

        // Set size
        block.style.height = this.block_size + 'px';
        block.style.width = this.block_size + 'px';

        // Style as dead
        if (value === STATE_DEAD) {
            block.classList.add('filled');
        }

        // Set neighbor value for debugging
        if (this.logic) {
            block.innerHTML = this.logic.getNeighborCount(index);
        }
    }
}


// State Logic
// ----------------------------------------------------------------------------

/**
 * LifeLogic
 *
 * This class deals with iterations, neighbors, and rules. It manages
 * the data that will be displayed on the board.
 *
 * It utilizes an extremely simple cache to speed the processing when
 * we use large boards and high numbers of iterations. A board 20x20
 * contains 400 objects that could be individually processed across
 * 50 iterations, for instance; which could be over 20,000 times.
 *
 * Caching reduces the need for redundant processing at the cost of memory.
 */
class LifeLogic // implements IBoardLogic
{
    /**
     * @param array data
     */
    constructor(data = []) {
        this.cache = {};
        this.originalData = this.setData(data);
    }

    /**
     * Allows the Board object to set itself as a reference
     *
     * @param Board board
     * @return this
     */
    setBoard(board) {
        this.board = board;
        return this;
    }

    /**
     * Set data object
     *
     * @param array data
     * @return void
     */
    setData(data = []) {
        this.data = data;
        return data;
    }

    /**
     * Uses the rules in our game to determine what the next
     * state for an item should be based on how many neighors
     * it has.
     *
     * The logic here is intentionally explicit because it's
     * pretty arbitrary as per the rules provided. If we make
     * a pattern out of this, it'll become more complicated
     * to change.
     *
     * @param int index
     * @param array data
     * @return string
     */
    determineNextState(index, data) {
        data || (data = this.data);

        const initialState = data[index];
        const neighborsFound = this.getNeighborCount(index, data);

        function withinRange(a, b) {
            return neighborsFound >= a && neighborsFound <= b;
        }

        // Zombification
        if (initialState === STATE_DEAD && neighborsFound === 3) {
            return STATE_ALIVE;
        }

        // Overpopulation
        else if (initialState === STATE_ALIVE && withinRange(4, 9999)) {
            return STATE_DEAD;
        }

        // Survival
        else if (initialState === STATE_ALIVE && withinRange(2, 3)) {
            return STATE_ALIVE;
        }

        // Underpopulation
        else if (initialState === STATE_ALIVE && withinRange(0, 1)) {
            return STATE_DEAD;
        }

        return initialState;
    }

    /**
     * Checks a key/val's neighbors to determine what
     * the next state should be
     *
     * @param int index
     * @param array data
     * @return int
     */
    getNeighborCount(index = 0, data) {
        data || (data = this.data);
        index = parseFloat(index);

        let output = 0;

        const x = this.board.columns;
        const y = this.board.rows;

        const a = Math.max(0, Math.floor((index - x) / x));
        const b = Math.floor(index / x);
        const c = Math.min(y - 1, Math.floor((index + x) / x));

        /**
         * This is the major part of my experiment. I didn't want to use
         * multi-dimensional arrays and I didn't want to use conditionals
         * or try/catches to determine my neighbor count.
         *
         * I wanted a solution that only used some sort of arithmetic
         * in order to determine how many neighbors a given index has.
         *
         * The following uses absolute values and numerical bases to
         * clamp bounds on a particular index.
         *
         * Why is this difficult?
         *
         * If you're using a 3x3 grid, your flat array looks like:
         *
         *     [0, 1, 2, 3, 4, 5, 6, 7, 8]
         *
         * A multidimensional version of this looks like:
         *
         *     [
         *         [0, 1, 2],
         *         [3, 4, 5],
         *         [6, 7, 8],
         *     ]
         *
         * In a flat version, if you were to look for the item LEFT
         * of the "3" position.. it would be 3-1 which equals 2. This
         * is a problem because it wraps, so we needed to find a
         * mathematical way to clamp bounds in a system that inherently
         * wraps.
         *
         * For the left-most bounds, we can use absolute values because
         * a -1 becomes 1, which is a redundant 4.
         *
         * For right-most bounds, we can use base shifting because a
         * base-10 4 doesn't exist in base-3; it would be represented
         * as "10", but below it's considered NaN.
         *
         * Using those two systems, we can clamp bounds around a "row"
         * in a flat array.
         *
         * Why would you do this?
         *
         * Because it's a challenge, and challenges are fun.
         *
         * Edit:
         *
         *     Before, we were using parseInt(value, radix) with integers
         *     but I made the mistake of thinking I could use a base-10
         *     integer in the value position like:
         *
         *         parseInt(13, 19);
         *
         *      but that evaluates out to 22, not 13. We should be using
         *      single characters, e.g. 13 = 'd'.
         *
         *      This limits us to 36 at the moment and adds more logic,
         *      but it's worth investigating further.
         */
        const grid = {
            [(a * x) + Math.abs(parseInt((index % x - 1).toString(36), x))]: 1,
            [(a * x) + parseInt((index % x - 0).toString(36), x)]: 1,
            [(a * x) + Math.min(x, parseInt((index % x + 1).toString(36), x))]: 1,

            [(b * x) + Math.abs(parseInt((index % x - 1).toString(36), x))]: 1,
            [(b * x) + Math.min(x, parseInt((index % x + 1).toString(36), x))]: 1,

            [(c * x) + Math.abs(parseInt((index % x - 1).toString(36), x))]: 1,
            [(c * x) + parseInt((index % x - 0).toString(36), x)]: 1,
            [(c * x) + Math.min(x, parseInt((index % x + 1).toString(36), x))]: 1,
        };

        output = Object
            .keys(grid)
            .filter(x => x >= 0 && x != index && data[x] === STATE_ALIVE)
            .length;

        return output;
    }

    /**
     * Process iteration(s) from a starting state.
     *
     * @param array data
     * @param int iterations
     * @param int iteration
     * @return void
     */
    process(data, iterations = 0, iteration = 0) {
        let currentData;

        // Check for cache first
        if (this.cache[iteration]) {
            currentData = this.cache[iteration];
        }
        else {
            // Define data
            currentData = Array.from(iteration === 0 ? this.originalData : data)

            // Loop through each item to determine its state next go around
            if (iteration > 0) {
                for (let i = 0, l = data.length; i < l; i++) {
                    currentData[i] = this.determineNextState(i, data);
                }
            }

            // Save cache
            this.cache[iteration] = Array.from(currentData);
        }

        // We have reached the limit, return the data
        if (++iteration > iterations) {
            return this.data = currentData;
        }

        return this.process(currentData, iterations, iteration);
    }

    /**
     * Generate random data
     *
     * @param float threshold
     * @return array
     */
    generateRandomData(threshold = 0.5) {
        this.data = [];

        // Generate random data
        for (let i = 0, l = this.board.rows * this.board.columns; i < l; i++) {
            this.data.push(Math.random() > threshold ? STATE_ALIVE : STATE_DEAD);
        }

        // Reset cache
        this.cache = {};

        // Reset our fixed starting point
        this.originalData = Array.from(this.data);

        return this.data;
    }
}


// Start
// -------------------------------------------------------------------------------

// const DEMO_DATA = [
//     STATE_DEAD, STATE_LIVE, STATE_DEAD,
//     STATE_DEAD, STATE_DEAD, STATE_LIVE,
//     STATE_LIVE, STATE_LIVE, STATE_LIVE,
//     STATE_DEAD, STATE_DEAD, STATE_DEAD,
// ];

const board = new Board({
    // logic: new LifeLogic(DEMO_DATA),
    logic: new LifeLogic(),
    columns: parseInt(inputColumns.value),
    rows: parseInt(inputRows.value),
});


// DOM
// -------------------------------------------------------------------------------

document.querySelector('.board-wrapper').appendChild(board.element);

inputRows.addEventListener('input', e => {
    board.updateSize(e.currentTarget.value).reset().display();
});

inputColumns.addEventListener('input', e => {
    board.updateSize(null, e.currentTarget.value).reset().display();
});

inputIterations.addEventListener('input', e => {
    board.logic.process(null, e.currentTarget.value);
    board.display();
});
