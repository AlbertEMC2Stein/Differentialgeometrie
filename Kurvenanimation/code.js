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
let debug0;
let debug1;

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
  mode = "STOP";
  debug0 = false;
  debug1 = false;

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
      return createVector(eval(exprX), eval(exprY));
    } catch {
      return createVector(0, 0);
    }
  }

  stroke(255);
  strokeWeight(1/(100*scaleFactor));
  drawCurve(t => p(t), 0, tMax*t, resolution);
  pop();

  if (debug0) {
    dataVAC(p, tMax*t);
  }
  if (debug1) {
    dataAf(p, tMax*t);
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

function dataVAC(func, time) {
  push();
  let endP = func(time);

  scale(100*scaleFactor, -100*scaleFactor);
  translate(endP.x, endP.y);

  let vB = D(func);
  let aB = D(vB);

  let vBt = vB(time)
  let aBt = aB(time)

  let mat = [vBt, aBt];
  let _vBt_ = vBt.mag();
  let curvatureInv = (_vBt_*_vBt_*_vBt_) / det(mat);
  let dir = createVector(-vBt.y/vBt.mag(), vBt.x/vBt.mag());

  strokeWeight(1/(100*scaleFactor));
  circle(0, 0, 0.05*scaleFactor, 0.05*scaleFactor);

  stroke(0, 255, 0);
  circle(curvatureInv*dir.x, curvatureInv*dir.y, 2*curvatureInv);

  stroke(255, 0, 0);
  line(0, 0, vBt.x, vBt.y);
  stroke(0, 0, 255);
  line(0, 0, aBt.x, aBt.y);
  pop();
}

function dataAf(func, time) {
  push();
  translate(width/2 - 90, height/2 - 90);

  stroke(255);
  circle(0, 0, 150);
  circle(0, 0, 2);

  let alpha = function(f0, t0) {
    let vBUt0 = D(f0)(t0).normalize();
    let xP = lerp(0, 75*vBUt0.x, t0/tMax);
    let yP = lerp(0, -75*vBUt0.y, t0/tMax);

    return createVector(xP, yP);
  }

  let vBUt = D(func)(time).normalize();
  let a = alpha(func, time);

  stroke(255, 0, 0);
  line(0, 0, 75*vBUt.x, -75*vBUt.y);
  drawCurve(t => alpha(func, t), 0, time);

  stroke(255);
  circle(a.x, a.y, 2);
  pop();
}

function segments(points) {
  beginShape();
  for (pt of points) {
    vertex(pt.x, pt.y);
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
  this.mDebug0 = debug0;
  this.mDebug1 = debug1;
};

window.onload = function() {
  options = new Settings();
  gui = new dat.GUI({width: 400});

  gui.add(options, 'mSpeed', 0.0, 2.0).step(0.01).name('Speed').onChange(function(value) {speed = value});
  gui.add(options, 'mResolution', 100, 500).name('Resolution').onChange(function(value) {resolution = round(value)});
  gui.add(options, 'mScaleFactor', 0.1, 2).name('Scalefactor').onChange(function(value) {scaleFactor = value});
  gui.add(options, 'mTMax', 1, 6*PI).step(0.01).name('Timespan').onChange(function(value) {tMax = value});
  gui.add(options, 'mMode', { Loop: "LOOP", Toggle: "TOGGLE", Stop: "STOP"}).name('Mode').onChange(function(value) {mode = value});
  gui.add(options, 'mDebug0').name('Show Vectors/Curvature').onChange(function(value) {debug0 = value});
  gui.add(options, 'mDebug1').name('Show Anglefunction').onChange(function(value) {debug1 = value});
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
    let x1 = (f(x+h).x - f(x).x)/h;
    let x2 = (f(x+h).y - f(x).y)/h;

    return createVector(x1, x2);
  }

  return dF;
}

function det(M) {
  return M[0].x*M[1].y - M[0].y*M[1].x;
}

function len(v) {
  return sqrt(sq(v[0]) + sq(v[1]));
}
