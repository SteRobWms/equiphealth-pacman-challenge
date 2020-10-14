import React from 'react';
import Button from '@material-ui/core/Button';
import { Typography } from '@material-ui/core';
import { makeStyles, Theme } from '@material-ui/core/styles';
import store from '../../redux/store';
import { initGame, resetScore, simulation } from '../../redux/actions';

interface ControlProps {
    score?: number;
    iteration?: number;
    runningScore?: number;
    simulationMode?: boolean;
}

const useStyles = makeStyles((theme: Theme) => ({
    score: {
        color: '#dd0',
        marginBottom: theme.spacing(2),
        marginTop: theme.spacing(2),
    },
    button: {
        marginBottom: theme.spacing(1)
    }
}));

//review
const Controls: React.FC<ControlProps> = ({ score, iteration, runningScore, simulationMode }): JSX.Element => {

    const styles = useStyles({});

    const handleNewGame = (): void => {
        store.dispatch(initGame());
    };

    const handleResetScore = (): void => {
        store.dispatch(resetScore());
    };

    //SRW 
    const handleSimulation = (): void => {
        store.dispatch(simulation());
    };

    return (
        <>
            <div className={styles.score}>
                <Typography variant="body1">
                    <b>Score:</b>
                    {' '}
                    {score || 0}
                </Typography>
                <Typography variant="body1">
                    <b>Total Score:</b>
                    {' '}
                    {runningScore || 0}
                </Typography>
                <Typography variant="body1">
                    <b>Iteration:</b>
                    {' '}
                    {iteration || 0}
                </Typography>
                <Typography variant="body1" style={{ color: "red" }}>
                    {simulationMode ? "* Running Simulations *" : ""}
                </Typography>
            </div>

            <Button onClick={handleNewGame} className={styles.button} fullWidth color="primary" variant="contained">New Game</Button>
            <Button onClick={handleResetScore} className={styles.button} fullWidth variant="contained">Reset Score and Play</Button>
            <Button onClick={handleSimulation} className={styles.button} fullWidth variant="contained">Run 100 Sims</Button>
        </>
    );
};

export default Controls;