import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Dimensions, Animated, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as AC from '@bacons/apple-colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Game constants
const BIRD_SIZE = 30;
const PIPE_WIDTH = 60;
const PIPE_GAP = 200;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const PIPE_SPEED = 3;

interface Bird {
  x: number;
  y: number;
  velocity: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
}

export default function FlappyBirdGame() {
  const insets = useSafeAreaInsets();
  const gameHeight = screenHeight - insets.top - insets.bottom;

  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start');
  const [score, setScore] = useState(0);
  const [bird, setBird] = useState<Bird>({ x: 100, y: gameHeight / 2, velocity: 0 });
  const [pipes, setPipes] = useState<Pipe[]>([]);

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const birdAnimatedValue = useRef(new Animated.Value(gameHeight / 2)).current;

  // Generate a new pipe
  const generatePipe = (): Pipe => {
    const topHeight = Math.random() * (gameHeight - PIPE_GAP - 200) + 100;
    const bottomHeight = gameHeight - topHeight - PIPE_GAP;

    return {
      x: screenWidth,
      topHeight,
      bottomHeight,
      passed: false,
    };
  };

  // Check collision
  const checkCollision = (birdPos: Bird, pipeList: Pipe[]): boolean => {
    // Check ground collision
    if (birdPos.y + BIRD_SIZE >= gameHeight || birdPos.y <= 0) {
      return true;
    }

    // Check pipe collision
    for (const pipe of pipeList) {
      if (
        birdPos.x + BIRD_SIZE > pipe.x &&
        birdPos.x < pipe.x + PIPE_WIDTH
      ) {
        if (
          birdPos.y < pipe.topHeight ||
          birdPos.y + BIRD_SIZE > pipe.topHeight + PIPE_GAP
        ) {
          return true;
        }
      }
    }

    return false;
  };

  // Start game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setBird({ x: 100, y: gameHeight / 2, velocity: 0 });
    setPipes([generatePipe()]);

    Animated.timing(birdAnimatedValue, {
      toValue: gameHeight / 2,
      duration: 0,
      useNativeDriver: false,
    }).start();
  };

  // Jump function
  const jump = () => {
    if (gameState === 'playing') {
      setBird(prev => ({ ...prev, velocity: JUMP_FORCE }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Game loop
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(() => {
        setBird(prevBird => {
          const newBird = {
            ...prevBird,
            y: prevBird.y + prevBird.velocity,
            velocity: prevBird.velocity + GRAVITY,
          };

          // Animate bird position
          Animated.timing(birdAnimatedValue, {
            toValue: newBird.y,
            duration: 50,
            useNativeDriver: false,
          }).start();

          return newBird;
        });

        setPipes(prevPipes => {
          let newPipes = prevPipes.map(pipe => ({
            ...pipe,
            x: pipe.x - PIPE_SPEED,
          }));

          // Remove off-screen pipes
          newPipes = newPipes.filter(pipe => pipe.x > -PIPE_WIDTH);

          // Add new pipe
          if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < screenWidth - 200) {
            newPipes.push(generatePipe());
          }

          // Update score
          newPipes.forEach(pipe => {
            if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
              pipe.passed = true;
              setScore(prev => prev + 1);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          });

          return newPipes;
        });
      }, 16); // ~60 FPS
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState, bird.x]);

  // Check collisions
  useEffect(() => {
    if (gameState === 'playing' && checkCollision(bird, pipes)) {
      setGameState('gameOver');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [bird, pipes, gameState]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: jump,
  });

  return (
    <View style={{ flex: 1, backgroundColor: AC.systemBlue }}>
      {/* Game Area */}
      <Pressable
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#70C5CE',
        }}
        onPress={jump}
        {...panResponder.panHandlers}
      >
        {/* Clouds background */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#70C5CE',
        }}>
          {/* Simple cloud shapes */}
          <View style={{
            position: 'absolute',
            top: 100,
            left: 50,
            width: 80,
            height: 30,
            backgroundColor: 'white',
            borderRadius: 15,
            opacity: 0.8,
          }} />
          <View style={{
            position: 'absolute',
            top: 200,
            right: 100,
            width: 60,
            height: 25,
            backgroundColor: 'white',
            borderRadius: 12,
            opacity: 0.8,
          }} />
        </View>

        {/* Pipes */}
        {pipes.map((pipe, index) => (
          <View key={index}>
            {/* Top pipe */}
            <View
              style={{
                position: 'absolute',
                left: pipe.x,
                top: 0,
                width: PIPE_WIDTH,
                height: pipe.topHeight,
                backgroundColor: '#228B22',
                borderWidth: 2,
                borderColor: '#006400',
              }}
            />
            {/* Bottom pipe */}
            <View
              style={{
                position: 'absolute',
                left: pipe.x,
                bottom: 0,
                width: PIPE_WIDTH,
                height: pipe.bottomHeight,
                backgroundColor: '#228B22',
                borderWidth: 2,
                borderColor: '#006400',
              }}
            />
          </View>
        ))}

        {/* Bird */}
        <Animated.View
          style={{
            position: 'absolute',
            left: bird.x,
            top: birdAnimatedValue,
            width: BIRD_SIZE,
            height: BIRD_SIZE,
            backgroundColor: '#FFD700',
            borderRadius: BIRD_SIZE / 2,
            borderWidth: 2,
            borderColor: '#FFA500',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          {/* Bird eye */}
          <View style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 6,
            height: 6,
            backgroundColor: '#000',
            borderRadius: 3,
          }} />
        </Animated.View>

        {/* Ground */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 50,
            backgroundColor: '#DEB887',
            borderTopWidth: 3,
            borderTopColor: '#D2691E',
          }}
        />

        {/* Score */}
        <View style={{
          position: 'absolute',
          top: insets.top + 20,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}>
          <Text style={{
            fontSize: 48,
            fontWeight: 'bold',
            color: 'white',
            textShadowColor: 'rgba(0, 0, 0, 0.5)',
            textShadowOffset: { width: 2, height: 2 },
            textShadowRadius: 3,
            fontVariant: ['tabular-nums'],
          }}>
            {score}
          </Text>
        </View>

        {/* Game States Overlay */}
        {gameState === 'start' && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: 'white',
              padding: 30,
              borderRadius: 20,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 8,
            }}>
              <Text style={{
                fontSize: 32,
                fontWeight: 'bold',
                color: '#333',
                marginBottom: 15,
              }}>
                Flappy Bird
              </Text>
              <Text style={{
                fontSize: 16,
                color: '#666',
                textAlign: 'center',
                marginBottom: 20,
              }}>
                Tap to make the bird fly{'\n'}through the green pipes!
              </Text>
              <Pressable
                style={{
                  backgroundColor: AC.systemBlue as string,
                  paddingHorizontal: 30,
                  paddingVertical: 15,
                  borderRadius: 25,
                }}
                onPress={startGame}
              >
                <Text style={{
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 'bold',
                }}>
                  Start Game
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {gameState === 'gameOver' && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: 'white',
              padding: 30,
              borderRadius: 20,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 8,
            }}>
              <Text style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: '#d32f2f',
                marginBottom: 10,
              }}>
                Game Over!
              </Text>
              <Text style={{
                fontSize: 20,
                color: '#333',
                marginBottom: 5,
              }}>
                Score: {score}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#666',
                textAlign: 'center',
                marginBottom: 20,
              }}>
                Great job! Try again to beat your score.
              </Text>
              <Pressable
                style={{
                  backgroundColor: AC.systemBlue as string,
                  paddingHorizontal: 30,
                  paddingVertical: 15,
                  borderRadius: 25,
                }}
                onPress={startGame}
              >
                <Text style={{
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 'bold',
                }}>
                  Play Again
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}