let canvasDiv;
let termFieldX;
let termFieldY;
let termMathJsX;
let termMathJsY;
let sign;

let speed;
let resolution;
let scaleFactor;
let tMax;
let mode;
let debug;

let t;

function setup() {
  canvasDiv = document.getElementById('canvas');
  let sketchCanvas = createCanvas(canvasDiv.clientWidth, canvasDiv.clientHeight, P2D);
  sketchCanvas.parent('canvas');
  pixelDensity(3);

  mq = MathQuill.getInterface(2);
  termFieldX = mq.MathField(document.getElementById('termX'));
  termFieldY = mq.MathField(document.getElementById('termY'));
  sign = 1;

  speed = 1;
  resolution = 100;
  scaleFactor = 1.0;
  tMax = TWO_PI;
  debug = false;
  mode = "STOP";

  t = 0;
}

function draw() {
  background(0);
  fill(255);
  text("t = " + nfc(t*tMax, 3), 5, 15);
  noFill();

  translate(width/2, height/2);

  push();
  scale(100*scaleFactor, -100*scaleFactor);

  coSys();

  p = function(time) {
    try {
      let exprX = latexToMathjs(termFieldX.latex());
      let exprY = latexToMathjs(termFieldY.latex());
      while (exprX.includes('T') || exprY.includes('T')) {
        exprX = exprX.replace('T', '(' + time + ')');
        exprY = exprY.replace('T', '(' + time + ')');
      }
      return [eval(exprX), eval(exprY)];
    } catch {
      return [0, 0];
    }
  }

  stroke(255);
  strokeWeight(1/(100*scaleFactor));
  drawCurve(t => p(t), 0, tMax*t, resolution);
  pop();

  if (debug) {
    data(p, tMax*t);
  }

  switch (mode) {
    case "LOOP":
      t = (t + 0.025*speed)%1;
      break;
    case "TOGGLE":
      let delta = (t + sign*0.025*speed);
      if (delta >= 1 || delta <= 0) {
        sign *= -1;
      }

      t = (t + sign*0.025*speed);
      break;
    case "STOP":
      t = min(t + 0.025*speed, 1);
      break;
  }
}

function windowResized() {
  resizeCanvas(canvasDiv.clientWidth, canvasDiv.clientHeight);
}

////////////////////////////////////////////

function coSys(time) {
  stroke(150);
  strokeWeight(1/(100*scaleFactor));
  line(0, -height/2, 0, height/2);
  line(-width/2, 0, width/2, 0);
}

function data(func, time) {
  push();
  let endP = func(time);

  scale(100*scaleFactor, -100*scaleFactor);
  translate(endP[0], endP[1]);

  let vB = D(func);
  let aB = D(vB);

  let vBt = vB(time)
  let aBt = aB(time)

  let mat = [vBt, aBt];
  let _vBt_ = len(vBt);
  let curvatureInv = (_vBt_*_vBt_*_vBt_) / det(mat);
  let dir = [-vBt[1]/sqrt(sq(vBt[0]) + sq(vBt[1])), vBt[0]/sqrt(sq(vBt[0]) + sq(vBt[1]))];

  strokeWeight(1/(100*scaleFactor));
  circle(0, 0, 0.05*scaleFactor, 0.05*scaleFactor);

  stroke(0, 255, 0);
  circle(curvatureInv*dir[0], curvatureInv*dir[1], 2*curvatureInv);

  stroke(255, 0, 0);
  line(0, 0, 0.5*vBt[0], 0.5*vBt[1]);
  stroke(0, 0, 255);
  line(0, 0, 0.5*aBt[0], 0.5*aBt[1]);
  pop();


  push();
  translate(width/2 - 90, height/2 - 90);

  stroke(255);
  circle(0, 0, 150);
  circle(0, 0, 2);

  let vBU = function(t0) {
    let vTemp = vB(t0);
    return mult(vTemp, 1/len(vTemp));
  }

  let alpha = function(t0) {
    let vBUt0 = vBU(t0);
    let xP = lerp(0, 75*vBUt0[0], t0/tMax);
    let yP = lerp(0, -75*vBUt0[1], t0/tMax);

    return [xP, yP];
  }

  let vBUt = vBU(time);
  let a = alpha(time);

  stroke(255, 0, 0);
  line(0, 0, 75*vBUt[0], -75*vBUt[1]);
  drawCurve(t => alpha(t), 0, time);

  stroke(255);
  circle(a[0], a[1], 2);
  pop();
}

function segments(points) {
  beginShape();
  for (pt of points) {
    vertex(pt[0], pt[1]);
  }
  endShape();
}

function drawCurve(f, a, b, n=100) {
  segments([...Array(n+1).keys()].map(k => f(a + (b-a)*k/n)));
}

////////////////////////////////////////////

var Settings = function() {
  this.mSpeed = speed;
  this.mResolution = resolution;
  this.mScaleFactor = scaleFactor;
  this.mTMax = tMax;
  this.mMode = mode;
  this.mDebug = debug;
};

window.onload = function() {
  options = new Settings();
  gui = new dat.GUI();

  gui.add(options, 'mSpeed', 0.0, 2.0).step(0.01).name('Speed').onChange(function(value) {speed = value});
  gui.add(options, 'mResolution', 100, 500).name('Resolution').onChange(function(value) {resolution = round(value)});
  gui.add(options, 'mScaleFactor', 0.1, 2).name('Scalefactor').onChange(function(value) {scaleFactor = value});
  gui.add(options, 'mTMax', 1, 6*PI).step(0.01).name('Timespan').onChange(function(value) {tMax = value});
  gui.add(options, 'mMode', { Loop: "LOOP", Toggle: "TOGGLE", Stop: "STOP"}).name('Mode').onChange(function(value) {mode = value});
  gui.add(options, 'mDebug').name('Debug').onChange(function(value) {debug = value});
};

////////////////////////////////////////////

function latexToMathjs(term) {
  let lTa = new latexToAst();


  let ast = lTa.convert(term);

  parse = function(input) {
    if (Array.isArray(input)) {
      let op = input[0];
      let o1 = input[1];
      let o2 = input[2];

      switch (op) {
        case "+":
          let sum = "";
          for (let i=1; i < input.length-1; i++) {
            sum += "(" + parse(input[i]) + ") + ";
          }
          sum += "(" + parse(input[input.length-1]) + ")";

          return sum;
          break;

        case "-":
          return "- (" + parse(o1) + ")";
          break;

        case "*":
          let prod = "";
          for (let i=1; i < input.length-1; i++) {
            prod += "(" + parse(input[i]) + ") * ";
          }
          prod += "(" + parse(input[input.length-1]) + ")";

          return prod;
          break;

        case "/":
          return "(" + parse(o1) + ") / (" + parse(o2) + ")";
          break;

        case "^":
          return "pow(" + parse(o1) + ", " + parse(o2) + ")";
          break;

        case "apply":
          switch (o1) {
            case "sin":
              return "sin(" + parse(o2) + ")";
              break;

            case "cos":
              return "cos(" + parse(o2) + ")";
              break;

            case "tan":
              return "tan(" + parse(o2) + ")";
              break;

            case "arcsin":
              return "asin(" + parse(o2) + ")";
              break;

            case "arccos":
              return "acos(" + parse(o2) + ")";
              break;

            case "arctan":
              return "atan(" + parse(o2) + ")";
              break;

            case "ln":
              return "log(" + parse(o2) + ", 2.7182818)";
              break;

            case "exp":
              return "exp(" + parse(o2) + ")";
              break;

            case "sqrt":
              return "sqrt(" + parse(o2) + ")";
              break;

            case "abs":
              return "abs(" + parse(o2) + ")";
              break;

            case "factorial":
              return "math.factorial(" + parse(o2) + ")";
              break;
          }
      }
    } else {
      if (input == "T") {
        return "T";
      } else  {
        return input.toString();
      }
    }
  }

  return parse(ast);
}

function D(f) {
  let h = 0.00001;
  dF = function (x) {
    let x1 = (f(x+h)[0] - f(x)[0])/h;
    let x2 = (f(x+h)[1] - f(x)[1])/h;

    return [x1, x2];
  }

  return dF;
}

function det(M) {
  return M[0][0]*M[1][1] - M[0][1]*M[1][0];
}

function mult(v, c) {
  return [v[0]*c, v[1]*c];
}

function len(v) {
  return sqrt(sq(v[0]) + sq(v[1]));
}
